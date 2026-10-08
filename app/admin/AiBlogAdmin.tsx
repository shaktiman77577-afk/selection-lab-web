"use client";

/**
 * AiBlogAdmin.tsx — Blog section ke upar "AI drafts" panel.
 *
 * page.tsx (BlogTab) me:  <AiBlogPanel api={api} onDraft={load} />
 *                         <GscCard api={api} post={p} onDone={load} />
 * Backend: routers/ai_blog.py + services/ai_blog.py (Gemini).
 *
 * Har naya course/series aur jinka blog nahi hai wo purane — Gemini unka
 * draft banata hai, din ki limit tak. Draft blog list me "AI DRAFT" ke saath
 * aata hai; admin padh ke publish karta hai. Apne aap kuch publish nahi hota.
 */

import { useEffect, useState, type CSSProperties } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";
const SITE = "https://www.selectionlab.in";

const inputStyle: CSSProperties = {
  width: "100%", padding: "9px", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.4)",
  color: "#fff", fontSize: 13, boxSizing: "border-box",
};
const btn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`,
  borderRadius: 9, padding: "8px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const goldBtn: CSSProperties = { ...btn, background: GOLD, color: "#1a1a1a", border: "none" };

const KIND: Record<string, string> = { course: "Course", mock: "Mock", tier2: "Typing", descriptive: "Descriptive" };
const REASON: Record<string, string> = {
  no_key: "Railway me GEMINI_API_KEY nahi hai.",
  disabled: "AI drafts band hain.",
  paused: "Gemini ki aaj ki free limit poori — kal apne aap phir shuru hoga.",
  limit: "Aaj ki limit poori ho gayi.",
  rate_limited: "Gemini ki free limit lag gayi — kal apne aap phir shuru hoga.",
  empty: "Line me abhi koi kaam nahi (naya kaam 30 minute baad shuru hota hai).",
  error: "Gemini se draft nahi bana",
};

export function AiBlogPanel({ api, onDraft }: { api: ApiFn; onDraft: () => void }) {
  const [d, setD] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState("20");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/ai-blog/admin/status").then((x) => {
      setD(x);
      setLimit(String(x.settings?.daily_limit ?? 20));
    }).catch((e) => setMsg(e.message));
  }
  useEffect(load, []);   // eslint-disable-line react-hooks/exhaustive-deps

  async function saveSettings(patch: any) {
    setMsg("");
    try {
      const s = d?.settings || {};
      await api("/ai-blog/admin/settings", "PUT", {
        enabled: s.enabled !== false, daily_limit: Number(limit) || 0, backfill: s.backfill !== false, ...patch,
      });
      load();
    } catch (e: any) { setMsg(e.message); }
  }

  async function runNow() {
    setBusy(true); setMsg("Gemini draft likh raha hai — 1 minute tak lag sakta hai...");
    try {
      const r = (await api("/ai-blog/admin/run-now", "POST")).result || {};
      if (r.ok) { setMsg("Draft ban gaya — neeche list me \"AI DRAFT\" dekhiye."); onDraft(); }
      else setMsg(`${REASON[r.reason] || r.reason}${r.detail ? ` — ${r.detail}` : ""}`);
      load();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  async function retry(id: number) {
    try { await api(`/ai-blog/admin/jobs/${id}/retry`, "POST"); load(); } catch (e: any) { setMsg(e.message); }
  }

  if (!d) return msg ? <div style={{ color: RED, fontSize: 12.5, marginBottom: 12 }}>{msg}</div> : null;

  const s = d.settings || {};
  const paused = s.paused_until && new Date(s.paused_until).getTime() > Date.now();
  const c = d.counts || {};

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14.5 }}>🤖 AI blog drafts (Gemini)</div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
            {!d.tables_ready ? "Pehle Supabase me sql/2026-10-08_ai_blog.sql chalaiye"
              : !d.key_set ? "Railway me GEMINI_API_KEY daaliye"
              : s.enabled === false ? "Band hai"
              : paused ? "Aaj ki Gemini limit poori — kal phir"
              : `Aaj ${d.done_today}/${s.daily_limit} · line me ${c.pending || 0}`}
          </div>
        </div>
        <button style={btn} onClick={() => setOpen(!open)}>{open ? "Band karo" : "Kholo"}</button>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, margin: "0 0 10px" }}>
            Naya course ya mock/typing/descriptive series banate hi, aur jin purane products ka blog nahi hai
            unka, Gemini apne aap SEO blog ka draft banata hai — har 10 minute me ek, din ki limit tak.
            Draft kabhi apne aap live nahi hota. Publish se pehle aankde (taarikh, post, fees) zaroor check kijiye.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
            <label style={{ flex: "1 1 120px" }}>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Din me max drafts</div>
              <input type="number" min={0} style={inputStyle} value={limit} onChange={(e) => setLimit(e.target.value)} />
            </label>
            <button style={btn} onClick={() => saveSettings({})}>Save</button>
            <button style={btn} onClick={() => saveSettings({ enabled: s.enabled === false })}>
              {s.enabled === false ? "Chalu karo" : "Band karo"}
            </button>
            <button style={btn} onClick={() => saveSettings({ backfill: s.backfill === false })}>
              Purane products: {s.backfill === false ? "band" : "chalu"}
            </button>
            {paused && <button style={btn} onClick={() => saveSettings({ clear_pause: true })}>Rok hatao</button>}
          </div>
          <button style={{ ...goldBtn, width: "100%", marginBottom: 10 }} disabled={busy || !d.key_set} onClick={runNow}>
            {busy ? "Ban raha hai..." : "Abhi ek draft banao"}
          </button>
          {msg && <div style={{ fontSize: 12.5, color: GOLD, marginBottom: 10, lineHeight: 1.5 }}>{msg}</div>}

          <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 6 }}>
            Bane: {c.done || 0} · Line me: {c.pending || 0} · Fail: {c.failed || 0} · Model: {d.model}
          </div>
          {(d.jobs || []).map((j: any) => (
            <div key={j.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12.5 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: GOLD, minWidth: 70 }}>{KIND[j.kind] || j.kind}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {j.product_title}
                {j.priority > 0 && <span style={{ color: GREEN, fontSize: 10.5 }}> · naya</span>}
                {j.error && <div style={{ color: j.status === "failed" ? RED : MUTED, fontSize: 11 }}>{j.error}</div>}
              </span>
              {j.status === "failed"
                ? <button style={btn} onClick={() => retry(j.id)}>Dobara</button>
                : <span style={{ fontSize: 11, color: MUTED }}>{j.status === "running" ? "ban raha" : "line me"}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Publish ke baad: Google Search Console ──────────────────────────────────
// Blog ke liye Google ki koi API nahi jo indexing maange (Indexing API sirf
// job/livestream pages ke liye hai) — isliye ye haath ka 30 second ka kaam.
export function GscCard({ api, post, onDone }: { api: ApiFn; post: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${SITE}/blog/${post.slug}`;

  if (!post.is_published) return null;
  if (post.gsc_requested_at) {
    return <div style={{ fontSize: 11, color: GREEN, marginTop: 6 }}>✓ Google ko bheja ({new Date(post.gsc_requested_at).toLocaleDateString("en-IN")})</div>;
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  async function done() {
    try { await api(`/ai-blog/admin/gsc-done/${post.id}`, "POST"); onDone(); } catch {}
  }

  return (
    <div style={{ marginTop: 8 }}>
      {!open ? (
        <button style={{ ...btn, borderColor: "rgba(93,217,124,0.5)", color: GREEN }} onClick={() => setOpen(true)}>
          🔎 Google ko bhejo
        </button>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 10, fontSize: 12.5, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Search Console me (30 second)</div>
          <div>1. Link copy karo: <button style={{ ...btn, padding: "3px 8px" }} onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</button></div>
          <div style={{ fontSize: 11, color: MUTED, wordBreak: "break-all" }}>{url}</div>
          <div>2. <a href="https://search.google.com/search-console" target="_blank" rel="noopener" style={{ color: GOLD }}>Search Console kholo</a>, upar wale search box me link paste karke Enter.</div>
          <div>3. &quot;Request Indexing&quot; dabao, 1-2 minute ruko.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={goldBtn} onClick={done}>Ho gaya</button>
            <button style={btn} onClick={() => setOpen(false)}>Baad me</button>
          </div>
        </div>
      )}
    </div>
  );
}
