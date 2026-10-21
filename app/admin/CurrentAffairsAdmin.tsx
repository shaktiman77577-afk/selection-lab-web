"use client";

/**
 * CurrentAffairsAdmin.tsx — "Current Affairs" (CA Pass) ka admin.
 *
 * page.tsx me:  <CurrentAffairsAdmin api={api} />     (tab "currentaffairs")
 * Backend: routers/current_affairs.py (/api/ca/admin/...).
 *
 * Hisse:
 *   Overview  — mahine, cards/MCQs, publish on/off
 *   Upload    — TSV ya pure mahine ka zip → pehle jaanch → phir import (ek-ek file)
 *   Browse    — card, MCQ, sources dekho aur wahin theek karo
 *   Analytics — kitne log aa rahe, naye/purane, quiz, kaun kya padh raha
 *   Video     — daily Shorts (9:16): slides + script download   (CAVideoAdmin.tsx)
 *   PDF & Ads — PDF download on/off, PDF ke andar ke ads (clickable), links, preview
 *   Pricing   — free kab tak, plans (Monthly...), sales, haath se plan (CAPricingAdmin.tsx)
 */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import ImageField from "./ImageField";
import CAPricingAdmin from "./CAPricingAdmin";
import CAVideoAdmin from "./CAVideoAdmin";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";
const YELLOW = "#f2c94c";

const input: CSSProperties = {
  width: "100%", padding: "9px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 13, boxSizing: "border-box",
};
const btn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 9,
  padding: "8px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const goldBtn: CSSProperties = { ...btn, background: GOLD, color: "#1a1a1a", border: "none" };
const box: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12 };
const label: CSSProperties = { fontSize: 11.5, color: MUTED, fontWeight: 700, margin: "8px 0 4px" };

type Sub = "overview" | "upload" | "browse" | "analytics" | "video" | "pdf" | "pricing";

function Msg({ text, ok }: { text: string; ok?: boolean }) {
  if (!text) return null;
  const c = ok ? GREEN : RED;
  return <div style={{ background: `${c}1a`, border: `1px solid ${c}55`, color: c, borderRadius: 10, padding: "9px 12px", fontSize: 13, marginBottom: 10 }}>{text}</div>;
}

function monthName(m: string) {
  const [y, mm] = m.split("-");
  const n = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(mm) - 1] || mm;
  return `${n} ${y}`;
}

// ── Bot CSV (Telegram Quiz Bot ke liye) ────────────────────────────────────
// Bot ka upload format: Question,A,B,C,D,Answer,Explanation,Topic
// Topic "Sep-2026" jaisa hota hai — bot isi se naya mahina pakadta hai aur quiz ka
// naam "September Current Affairs + GK Quiz" banata hai.

/** HTML → saaf text: <br> = nayi line, baaki tags hata do, &amp; jaise entities khol do. */
function plainText(s: unknown): string {
  if (s == null) return "";
  let t = String(s)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  if (t.includes("&") && typeof DOMParser !== "undefined") {
    t = new DOMParser().parseFromString(`<!doctype html><body>${t.replace(/</g, "&lt;")}`, "text/html").body.textContent || t;
  }
  return t.replace(/\r/g, "").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function csvCell(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

/** Ek mahine ke saare cards. API ek baar me 600 tak deti hai, isliye bade mahine block-wise aate hain. */
async function fetchMonthCards(api: ApiFn, m: any): Promise<any[]> {
  if ((m.cards || 0) <= 600) return (await api(`/ca/admin/cards?month=${m.month}`)).cards || [];
  const byRef = new Map<string, any>();
  for (const b of Object.keys(m.blocks || {})) {
    if (b === "0") continue;
    for (const c of (await api(`/ca/admin/cards?month=${m.month}&block=${b}`)).cards || []) byRef.set(c.ref_no, c);
  }
  if (m.blocks?.["0"]) {
    for (const c of (await api(`/ca/admin/cards?month=${m.month}`)).cards || []) if (!c.block) byRef.set(c.ref_no, c);
  }
  return [...byRef.values()];
}

async function downloadBotCsv(api: ApiFn, m: any): Promise<{ rows: number; skipped: number; file: string }> {
  const cards = await fetchMonthCards(api, m);
  const topic = monthName(m.month).replace(" ", "-");          // "Sep-2026"
  const lines = [["Question", "A", "B", "C", "D", "Answer", "Explanation", "Topic"].map(csvCell).join(",")];
  let rows = 0, skipped = 0;
  for (const c of cards) {
    for (const q of c.mcqs || []) {
      const cells = [q.question_en, q.option_a_en, q.option_b_en, q.option_c_en, q.option_d_en].map(plainText);
      const ans = String(q.correct_answer || "").trim().toUpperCase();
      if (cells.some((x) => !x) || !["A", "B", "C", "D"].includes(ans)) { skipped++; continue; }
      lines.push([...cells, ans, plainText(q.explanation_en), topic].map(csvCell).join(","));
      rows++;
    }
  }
  const file = `bot-ca-${topic}.csv`;
  if (rows) {
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return { rows, skipped, file };
}

function fmtTime(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return s; }
}

export default function CurrentAffairsAdmin({ api }: { api: ApiFn }) {
  const [sub, setSub] = useState<Sub>("overview");
  const [browseAt, setBrowseAt] = useState<{ month: string; block?: number } | null>(null);
  const tabs: [Sub, string][] = [
    ["overview", "📅 Overview"], ["upload", "⬆️ Upload"], ["browse", "🔍 Browse"],
    ["analytics", "📊 Analytics"], ["video", "🎬 Video"], ["pdf", "📄 PDF & Ads"], ["pricing", "💰 Pricing"],
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
        {tabs.map(([k, t]) => (
          <button key={k} onClick={() => setSub(k)}
            style={{ ...(sub === k ? goldBtn : btn), whiteSpace: "nowrap", flexShrink: 0 }}>{t}</button>
        ))}
      </div>
      {sub === "overview" && <Overview api={api} onBrowse={(month, block) => { setBrowseAt({ month, block }); setSub("browse"); }} />}
      {sub === "upload" && <Upload api={api} />}
      {sub === "browse" && <Browse api={api} start={browseAt} />}
      {sub === "analytics" && <Analytics api={api} />}
      {sub === "video" && <CAVideoAdmin api={api} />}
      {sub === "pdf" && <PdfAds api={api} />}
      {sub === "pricing" && <CAPricingAdmin api={api} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════
function Overview({ api, onBrowse }: { api: ApiFn; onBrowse: (m: string, b?: number) => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [csvBusy, setCsvBusy] = useState("");
  const [csvNote, setCsvNote] = useState<Record<string, { ok: boolean; text: string }>>({});

  function load() {
    api("/ca/admin/overview").then(setD).catch((e) => setErr(e.message));
  }

  async function botCsv(m: any) {
    setCsvBusy(m.month);
    setCsvNote((n) => ({ ...n, [m.month]: { ok: true, text: "Ban rahi hai…" } }));
    try {
      const r = await downloadBotCsv(api, m);
      const text = r.rows
        ? `✅ ${r.file} — ${r.rows} MCQs${r.skipped ? ` (${r.skipped} adhoore chhode)` : ""}. Bot me: Admin → Upload CSV → Current Affairs.`
        : "Is mahine me koi poora MCQ nahi mila.";
      setCsvNote((n) => ({ ...n, [m.month]: { ok: r.rows > 0, text } }));
    } catch (e: any) {
      setCsvNote((n) => ({ ...n, [m.month]: { ok: false, text: e.message || "Download nahi ho paaya" } }));
    }
    setCsvBusy("");
  }
  useEffect(load, [api]);

  async function publish(month: string, on: boolean) {
    if (!on && !confirm(`${monthName(month)} ko students se chhupa dein?`)) return;
    setBusy(month);
    try { await api("/ca/admin/publish", "POST", { month, publish: on }); load(); }
    catch (e: any) { setErr(e.message); }
    setBusy("");
  }

  if (err) return <Msg text={err} />;
  if (!d) return <div style={{ color: MUTED }}>Loading…</div>;
  const names: Record<string, string> = d.block_names || {};
  return (
    <div>
      {(d.warnings || []).map((w: string) => (
        <div key={w} style={{ ...box, borderColor: `${YELLOW}88`, color: YELLOW, fontSize: 13 }}>⚠️ {w}</div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        <Tile label="Cards" value={d.totals.cards} />
        <Tile label="MCQs" value={d.totals.mcqs} />
        <Tile label="Published" value={d.totals.published} />
      </div>
      <div style={{ ...box, fontSize: 12.5, color: MUTED }}>
        {d.free_now
          ? <>🎁 Abhi <b style={{ color: GREEN }}>free</b> hai — <b style={{ color: "#fff" }}>{d.settings.free_until}</b> tak (login zaroori: {d.settings.require_login ? "haan" : "nahi"})</>
          : <>🔒 Free period khatam — students plan lekar padhte hain (💰 Pricing tab)</>}
      </div>
      {d.months.length === 0 && <div style={{ ...box, color: MUTED }}>Abhi koi data nahi. Upload tab se mahine ka zip daaliye.</div>}
      {d.months.map((m: any) => {
        const allPub = m.published === m.cards;
        const nonePub = m.published === 0;
        return (
          <div key={m.month} style={box}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setOpen(open === m.month ? null : m.month)} style={{ ...btn, border: "none", padding: 0, flex: 1, textAlign: "left" }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{monthName(m.month)}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {m.cards} cards · {m.mcqs} MCQs · {Object.keys(m.blocks).length} blocks
                </div>
              </button>
              <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 6, padding: "3px 8px", color: "#111",
                background: allPub ? GREEN : nonePub ? "#6b6f78" : YELLOW }}>
                {allPub ? "LIVE" : nonePub ? "DRAFT" : `${m.published}/${m.cards} live`}
              </span>
              <button disabled={busy === m.month} onClick={() => publish(m.month, !allPub)} style={allPub ? btn : goldBtn}>
                {allPub ? "Hide" : "Publish"}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button disabled={csvBusy === m.month || !m.mcqs} onClick={() => botCsv(m)}
                style={{ ...btn, padding: "6px 10px", fontSize: 12, opacity: csvBusy === m.month || !m.mcqs ? 0.6 : 1 }}>
                {csvBusy === m.month ? "⏳ Bot CSV…" : "⬇️ Bot CSV"}
              </button>
              {csvNote[m.month] && (
                <span style={{ fontSize: 11.5, color: csvNote[m.month].ok ? MUTED : RED, flex: 1, minWidth: 160 }}>
                  {csvNote[m.month].text}
                </span>
              )}
            </div>
            {open === m.month && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6, marginTop: 10 }}>
                {Object.keys(m.blocks).sort((a, b) => Number(a) - Number(b)).map((b) => (
                  <button key={b} onClick={() => onBrowse(m.month, Number(b) || undefined)}
                    style={{ ...btn, textAlign: "left", fontWeight: 600 }}>
                    <div style={{ color: GOLD, fontWeight: 800 }}>Block {b}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{names[b] || ""}</div>
                    <div style={{ fontSize: 12, marginTop: 3 }}>{m.blocks[b].cards} cards · {m.blocks[b].mcqs} Q</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Tile({ label: l, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{l}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "#fff", marginTop: 2 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  UPLOAD — jaanch, phir ek-ek file import
// ═══════════════════════════════════════════════════════════════════════════
function readText(f: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = rej; r.readAsText(f, "utf-8"); });
}
function readDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = rej; r.readAsDataURL(f); });
}

/** Daily prompt ke saath paste karne ke liye — jo news pehle aa chuki (repeat na ho, sirf UPDATE). */
function Covered({ api }: { api: ApiFn }) {
  const [days, setDays] = useState(15);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [busy, setBusy] = useState(false);
  async function copy() {
    setBusy(true); setMsg({ t: "" });
    try {
      const r = await api(`/ca/admin/covered?days=${days}`);
      setText(r.text || "");
      try {
        await navigator.clipboard.writeText(r.text || "");
        setMsg({ t: `${r.count} topics copy ho gaye (${r.from} se ${r.to}). Daily prompt ke neeche paste kariye.`, ok: true });
      } catch {
        setMsg({ t: `${r.count} topics — neeche ke box se select karke copy kariye.`, ok: true });
      }
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy(false);
  }
  return (
    <div style={box}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>📋 Daily prompt ke saath: pichhli news ki list</div>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
        Har din prompt chalane se pehle ye list copy karke prompt ke saath paste kariye. Prompt in news ko dobara nahi banayega —
        kisi purani news me naya development ho to sirf <b style={{ color: "#fff" }}>1 UPDATE card + 1 sawaal</b>.
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {[7, 15, 30].map((n) => <button key={n} onClick={() => setDays(n)} style={days === n ? goldBtn : btn}>{n} din</button>)}
        <button onClick={copy} disabled={busy} style={{ ...goldBtn, marginLeft: "auto" }}>{busy ? "…" : "📋 Copy karo"}</button>
      </div>
      <div style={{ marginTop: 8 }}><Msg text={msg.t} ok={msg.ok} /></div>
      {text && <textarea readOnly value={text} rows={6} onFocus={(e) => e.target.select()}
        style={{ ...input, resize: "vertical", fontFamily: "monospace", fontSize: 11.5 }} />}
    </div>
  );
}

function Upload({ api }: { api: ApiFn }) {
  const [files, setFiles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [open, setOpen] = useState<string | null>(null);
  const [prog, setProg] = useState<{ done: number; total: number; current: string } | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [log, setLog] = useState<any[]>([]);

  function loadLog() { api("/ca/admin/uploads").then((d) => setLog(d.uploads || [])).catch(() => {}); }
  useEffect(loadLog, [api]);

  async function pick(list: FileList | null) {
    if (!list || !list.length) return;
    setBusy(true); setMsg({ t: "" }); setResults({}); setFiles([]);
    try {
      const plain: { name: string; text: string }[] = [];
      const out: any[] = [];
      for (const f of Array.from(list)) {
        if (f.name.toLowerCase().endsWith(".zip")) {
          const d = await api("/ca/admin/check", "POST", { zip_b64: await readDataUrl(f) });
          out.push(...(d.files || []));
        } else if (f.name.toLowerCase().endsWith(".tsv") || f.name.toLowerCase().endsWith(".txt")) {
          plain.push({ name: f.name, text: await readText(f) });
        }
      }
      if (plain.length) {
        const d = await api("/ca/admin/check", "POST", { files: plain });
        (d.files || []).forEach((x: any, i: number) => out.push({ ...x, text: plain[i].text }));
      }
      // Error wali upar, phir mahina aur block number ke kram me
      out.sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1)
        || String(a.target?.ca_month || a.target?.ca_date).localeCompare(String(b.target?.ca_month || b.target?.ca_date))
        || (a.target?.block || 0) - (b.target?.block || 0));
      // Ek hi block do baar (jaise purani + fixed file) — sirf aakhri wali bachegi
      const seen: Record<string, number> = {};
      out.forEach((f) => { if (f.ok) { const k = f.target?.label; seen[k] = (seen[k] || 0) + 1; } });
      out.forEach((f) => { f.dup = f.ok && seen[f.target?.label] > 1; });
      setFiles(out);
      if (!out.length) setMsg({ t: "Isme koi .tsv file nahi mili" });
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy(false);
  }

  const good = files.filter((f) => f.ok);
  const bad = files.filter((f) => !f.ok);

  async function importAll() {
    if (!good.length) return;
    const replacing = good.filter((f) => f.existing > 0).length;
    if (!confirm(`${good.length} files import hongi${replacing ? ` (${replacing} blocks ka purana data badal jayega)` : ""}. Aage badhein?`)) return;
    setBusy(true); setMsg({ t: "" });
    const res: Record<string, any> = {};
    let ok = 0, fail = 0;
    for (let i = 0; i < good.length; i++) {
      const f = good[i];
      setProg({ done: i, total: good.length, current: f.target?.label || f.name });
      try { res[f.name + f.target?.label] = await api("/ca/admin/import", "POST", { name: f.name, text: f.text }); ok++; }
      catch (e: any) { res[f.name + f.target?.label] = { error: e.message }; fail++; }
      setResults({ ...res });
    }
    setProg(null); setBusy(false); loadLog();
    setMsg({ t: `${ok} files import ho gayi${fail ? `, ${fail} fail` : ""}. Naye mahine Overview me "Publish" karke live kariye.`, ok: !fail });
  }

  return (
    <div>
      <Covered api={api} />
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>TSV ya zip daaliye</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
          Ek block ki TSV, kai TSV, ya pure mahine (ya kai mahine) ka zip. Pehle jaanch hogi — jis file me error hai wo import nahi hogi.
          Jo block pehle se hai, dobara upload karne par <b style={{ color: "#fff" }}>poora badal jayega</b>.
        </div>
        <input type="file" multiple accept=".tsv,.txt,.zip" disabled={busy}
          onChange={(e) => { pick(e.target.files); e.target.value = ""; }} style={{ ...input, padding: 8 }} />
      </div>
      <Msg text={msg.t} ok={msg.ok} />
      {busy && !prog && <div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>Jaanch ho rahi hai…</div>}
      {prog && (
        <div style={box}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Import: {prog.done}/{prog.total} — {prog.current}</div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
            <div style={{ height: 8, width: `${(prog.done / prog.total) * 100}%`, background: GOLD, borderRadius: 4 }} />
          </div>
        </div>
      )}
      {files.length > 0 && (
        <div style={{ ...box, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            <b style={{ color: GREEN }}>{good.length} theek</b>{bad.length > 0 && <> · <b style={{ color: RED }}>{bad.length} me error</b></>}
            {" · "}{good.reduce((s, f) => s + (f.stats?.cards || 0), 0)} cards, {good.reduce((s, f) => s + (f.stats?.mcqs || 0), 0)} MCQs
          </div>
          <button disabled={busy || !good.length} onClick={importAll} style={goldBtn}>Import {good.length} files</button>
        </div>
      )}
      {files.map((f) => {
        const key = f.name + f.target?.label;
        const r = results[key];
        return (
          <div key={key} style={{ ...box, borderColor: f.ok ? BORDER : `${RED}88` }}>
            <button onClick={() => setOpen(open === key ? null : key)} style={{ ...btn, border: "none", padding: 0, width: "100%", textAlign: "left" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5 }}>{f.target?.label || f.name}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
                    {f.name} · {f.stats?.cards} cards · {f.stats?.mcqs} MCQs{f.stats?.days ? ` · ${f.stats.days} days` : ""}
                    {f.existing > 0 && <span style={{ color: YELLOW }}> · {f.existing} purane cards badlenge</span>}
                    {f.dup && <span style={{ color: RED }}> · ye block is batch me do baar hai — ek hi file rakhiye</span>}
                  </div>
                </div>
                {f.errors > 0 && <span style={{ color: RED, fontWeight: 800, fontSize: 12 }}>{f.errors} error</span>}
                {f.warnings > 0 && <span style={{ color: YELLOW, fontWeight: 700, fontSize: 12 }}>{f.warnings} warn</span>}
                {r && (r.error ? <span style={{ color: RED, fontSize: 12 }}>✗</span> : <span style={{ color: GREEN, fontSize: 12, fontWeight: 800 }}>✓ done</span>)}
              </div>
            </button>
            {r?.error && <Msg text={r.error} />}
            {open === key && (
              <div style={{ marginTop: 8, maxHeight: 320, overflowY: "auto" }}>
                {(f.issues || []).length === 0 && <div style={{ color: GREEN, fontSize: 12.5 }}>Koi problem nahi ✓</div>}
                {(f.issues || []).map((i: any, n: number) => (
                  <div key={n} style={{ fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: i.lvl === "err" ? RED : YELLOW, fontWeight: 800 }}>{i.lvl === "err" ? "ERROR" : "warn"}</span>
                    <span style={{ color: MUTED }}> · {i.where}</span>
                    <div style={{ color: "#ddd", marginTop: 2 }}>{i.msg}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {log.length > 0 && (
        <div style={box}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Pichhle uploads</div>
          {log.slice(0, 30).map((u) => (
            <div key={u.id} style={{ fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
              <span style={{ flex: 1 }}>{u.ca_month} {u.block ? `· B${u.block}` : ""} <span style={{ color: MUTED }}>({u.file_name})</span></span>
              <span style={{ color: MUTED }}>{u.cards}c / {u.mcqs}q{u.replaced ? ` · ${u.replaced} badle` : ""}</span>
              <span style={{ color: MUTED }}>{fmtTime(u.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  BROWSE + EDIT
// ═══════════════════════════════════════════════════════════════════════════
const CARD_FIELDS: [string, string, boolean?][] = [
  ["ca_date", "Date (YYYY-MM-DD)"], ["category", "Category"], ["state", "State"],
  ["stem_en", "Stem EN", true], ["stem_hi", "Stem HI", true], ["answer_en", "Answer EN"], ["answer_hi", "Answer HI"],
  ["detail_en", "Detail EN", true], ["detail_hi", "Detail HI", true],
  ["static_gk_en", "Static GK EN", true], ["static_gk_hi", "Static GK HI", true],
];
const MCQ_FIELDS: [string, string, boolean?][] = [
  ["question_en", "Question EN", true], ["question_hi", "Question HI", true],
  ["option_a_en", "A EN"], ["option_a_hi", "A HI"], ["option_b_en", "B EN"], ["option_b_hi", "B HI"],
  ["option_c_en", "C EN"], ["option_c_hi", "C HI"], ["option_d_en", "D EN"], ["option_d_hi", "D HI"],
  ["explanation_en", "Explanation EN (4 hisse <br> se)", true], ["explanation_hi", "Explanation HI", true],
];

function Browse({ api, start }: { api: ApiFn; start: { month: string; block?: number } | null }) {
  const [months, setMonths] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [month, setMonth] = useState(start?.month || "");
  const [block, setBlock] = useState<number | undefined>(start?.block);
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [hi, setHi] = useState(false);

  useEffect(() => {
    api("/ca/admin/overview").then((d) => {
      setMonths(d.months || []); setNames(d.block_names || {});
      if (!start?.month && d.months?.[0]) setMonth(d.months[0].month);
    }).catch((e) => setErr(e.message));
  }, [api, start]);

  function load(search?: string) {
    setErr(""); setCards(null);
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    else { if (!month) return; p.set("month", month); if (block) p.set("block", String(block)); }
    api(`/ca/admin/cards?${p}`).then((d) => setCards(d.cards || [])).catch((e) => setErr(e.message));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (month) load(); }, [month, block]);

  const m = months.find((x) => x.month === month);
  return (
    <div>
      <div style={box}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select value={month} onChange={(e) => { setMonth(e.target.value); setBlock(undefined); }} style={{ ...input, flex: 1 }}>
            {months.map((x) => <option key={x.month} value={x.month}>{monthName(x.month)} ({x.cards})</option>)}
          </select>
          <button onClick={() => setHi(!hi)} style={btn}>{hi ? "हिंदी" : "EN"}</button>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          <button onClick={() => setBlock(undefined)} style={{ ...(block ? btn : goldBtn), flexShrink: 0 }}>All</button>
          {m && Object.keys(m.blocks).sort((a, b) => Number(a) - Number(b)).map((b) => (
            <button key={b} onClick={() => setBlock(Number(b))} title={names[b]}
              style={{ ...(block === Number(b) ? goldBtn : btn), flexShrink: 0 }}>B{b}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: stem / answer / ref" style={{ ...input, flex: 1 }}
            onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) load(q.trim()); }} />
          <button onClick={() => q.trim() && load(q.trim())} style={btn}>Search</button>
        </div>
      </div>
      <Msg text={err} />
      {!cards && !err && <div style={{ color: MUTED }}>Loading…</div>}
      {cards && cards.length === 0 && <div style={{ ...box, color: MUTED }}>Koi card nahi.</div>}
      {cards && cards.map((c) => (
        <CardRow key={c.ref_no} api={api} c={c} hi={hi} open={openRef === c.ref_no}
          onToggle={() => setOpenRef(openRef === c.ref_no ? null : c.ref_no)}
          onDeleted={() => setCards((cs) => (cs || []).filter((x) => x.ref_no !== c.ref_no))} />
      ))}
    </div>
  );
}

function Field({ k, label: l, area, value, onChange }: { k: string; label: string; area?: boolean; value: any; onChange: (k: string, v: string) => void }) {
  return (
    <div>
      <div style={label}>{l}</div>
      {area
        ? <textarea value={value ?? ""} onChange={(e) => onChange(k, e.target.value)} rows={3} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
        : <input value={value ?? ""} onChange={(e) => onChange(k, e.target.value)} style={input} />}
    </div>
  );
}

function CardRow({ api, c, hi, open, onToggle, onDeleted }: { api: ApiFn; c: any; hi: boolean; open: boolean; onToggle: () => void; onDeleted: () => void }) {
  const [f, setF] = useState<any>(c);
  const [day, setDay] = useState<any>(c.day || null);
  const [src, setSrc] = useState<any>(c.sources || {});
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF((x: any) => ({ ...x, [k]: v }));

  async function save() {
    setSaving(true); setMsg({ t: "" });
    const fields: any = {};
    CARD_FIELDS.forEach(([k]) => { if (f[k] !== c[k]) fields[k] = f[k]; });
    if (f.important !== c.important) fields.important = f.important;
    if (f.is_published !== c.is_published) fields.is_published = f.is_published;
    if (!!f.is_update !== !!c.is_update) fields.is_update = !!f.is_update;
    if (day && c.day) fields.day = day;
    fields.sources = src;
    try { await api(`/ca/admin/card/${encodeURIComponent(c.ref_no)}`, "PUT", { fields }); setMsg({ t: "Save ho gaya", ok: true }); }
    catch (e: any) { setMsg({ t: e.message }); }
    setSaving(false);
  }
  async function del() {
    if (!confirm(`Card ${c.ref_no} aur iske saare MCQs hata dein?`)) return;
    try { await api(`/ca/admin/card/${encodeURIComponent(c.ref_no)}`, "DELETE"); onDeleted(); }
    catch (e: any) { setMsg({ t: e.message }); }
  }

  return (
    <div style={{ ...box, padding: 12 }}>
      <button onClick={onToggle} style={{ ...btn, border: "none", padding: 0, width: "100%", textAlign: "left", fontWeight: 400 }}>
        <div style={{ fontSize: 11, color: MUTED, display: "flex", gap: 8 }}>
          <span>{c.ref_no}</span><span>{String(c.ca_date).slice(0, 10)}</span>
          <span style={{ color: c.is_published ? GREEN : "#888" }}>{c.is_published ? "live" : "draft"}</span>
          {f.is_update && <span style={{ color: "#8fb3ff", fontWeight: 800 }}>UPDATE</span>}
          <span style={{ marginLeft: "auto" }}>{(c.mcqs || []).length} Q</span>
        </div>
        <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.45 }}>{hi ? f.stem_hi : f.stem_en}</div>
        <div style={{ fontSize: 13.5, color: GOLD, fontWeight: 800, marginTop: 3 }}>{hi ? f.answer_hi : f.answer_en}</div>
      </button>
      {open && (
        <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6 }}>
          <Msg text={msg.t} ok={msg.ok} />
          {CARD_FIELDS.map(([k, l, a]) => <Field key={k} k={k} label={l} area={a} value={f[k]} onChange={set} />)}
          <div style={{ display: "flex", gap: 14, margin: "10px 0", fontSize: 13 }}>
            <label><input type="checkbox" checked={!!f.important} onChange={(e) => setF({ ...f, important: e.target.checked })} /> Important</label>
            <label><input type="checkbox" checked={!!f.is_update} onChange={(e) => setF({ ...f, is_update: e.target.checked })} /> UPDATE (purani news)</label>
            <label><input type="checkbox" checked={!!f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Published</label>
          </div>
          {day && (
            <div style={{ ...box, background: "rgba(0,0,0,0.25)" }}>
              <div style={{ fontWeight: 800, fontSize: 12.5 }}>📅 Important Day</div>
              {[["day_date", "Date"], ["day_en", "Day EN"], ["day_hi", "Day HI"], ["theme_en", "Theme EN"], ["theme_hi", "Theme HI"],
                ["first_observed", "First observed"], ["observed_by_en", "Observed by EN"], ["observed_by_hi", "Observed by HI"]].map(([k, l]) => (
                <Field key={k} k={k} label={l} value={day[k]} onChange={(kk, v) => setDay({ ...day, [kk]: v })} />
              ))}
            </div>
          )}
          <div style={{ ...box, background: "rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight: 800, fontSize: 12.5 }}>🔗 Sources (sirf admin ko dikhte hain)</div>
            {["source_1", "source_2", "source_3"].map((k) => (
              <div key={k} style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}><Field k={k} label={k.replace("_", " ")} value={src[k]} onChange={(kk, v) => setSrc({ ...src, [kk]: v })} /></div>
                {src[k] && <a href={src[k]} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none", marginBottom: 1 }}>Open</a>}
              </div>
            ))}
            <Field k="proof_line" label="Proof line" area value={src.proof_line} onChange={(kk, v) => setSrc({ ...src, [kk]: v })} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button disabled={saving} onClick={save} style={goldBtn}>{saving ? "Saving…" : "Save card"}</button>
            <button onClick={del} style={{ ...btn, color: RED, borderColor: `${RED}66` }}>Delete card</button>
          </div>
          {(c.mcqs || []).map((q: any) => <McqEdit key={q.id} api={api} q={q} />)}
        </div>
      )}
    </div>
  );
}

function McqEdit({ api, q }: { api: ApiFn; q: any }) {
  const [f, setF] = useState<any>(q);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [gone, setGone] = useState(false);
  const set = (k: string, v: string) => setF((x: any) => ({ ...x, [k]: v }));
  async function save() {
    const fields: any = {};
    [...MCQ_FIELDS.map(([k]) => k), "correct_answer", "difficulty", "q_type"].forEach((k) => { if (f[k] !== q[k]) fields[k] = f[k]; });
    try { await api(`/ca/admin/mcq/${q.id}`, "PUT", { fields }); setMsg({ t: "Save ho gaya", ok: true }); }
    catch (e: any) { setMsg({ t: e.message }); }
  }
  async function del() {
    if (!confirm("Ye MCQ hata dein?")) return;
    try { await api(`/ca/admin/mcq/${q.id}`, "DELETE"); setGone(true); } catch (e: any) { setMsg({ t: e.message }); }
  }
  if (gone) return null;
  const opt = (L: string) => f[`option_${L.toLowerCase()}_en`];
  return (
    <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} style={{ ...btn, border: "none", padding: 0, width: "100%", textAlign: "left", fontWeight: 400 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#111", background: GOLD, borderRadius: 5, padding: "1px 6px" }}>{f.q_type}</span>
        <div style={{ fontSize: 13, marginTop: 6 }} dangerouslySetInnerHTML={{ __html: f.question_en }} />
        <div style={{ fontSize: 12, color: GREEN, marginTop: 4 }}>✓ {f.correct_answer}. {opt(f.correct_answer)}</div>
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          <Msg text={msg.t} ok={msg.ok} />
          {MCQ_FIELDS.map(([k, l, a]) => <Field key={k} k={k} label={l} area={a} value={f[k]} onChange={set} />)}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={label}>Correct</div>
              <select value={f.correct_answer} onChange={(e) => set("correct_answer", e.target.value)} style={input}>
                {["A", "B", "C", "D"].map((L) => <option key={L}>{L}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={label}>Difficulty</div>
              <select value={f.difficulty || "Medium"} onChange={(e) => set("difficulty", e.target.value)} style={input}>
                {["Easy", "Medium", "Hard"].map((L) => <option key={L}>{L}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={save} style={goldBtn}>Save MCQ</button>
            <button onClick={del} style={{ ...btn, color: RED, borderColor: `${RED}66` }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════
function Bars({ data, valueKey, labelOf, height = 110, color = GOLD, tip }: {
  data: any[]; valueKey: string; labelOf: (d: any, i: number) => string; height?: number; color?: string; tip: (d: any) => string;
}) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div style={{ height: 18, fontSize: 12, color: "#fff" }}>{hover !== null ? tip(data[hover]) : <span style={{ color: MUTED }}>Bar par ungli rakhiye</span>}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        {data.map((d, i) => {
          const v = Number(d[valueKey]) || 0;
          return (
            <div key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} onMouseLeave={() => setHover(null)}
              title={tip(d)} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "pointer" }}>
              <div style={{ width: "100%", height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0, background: hover === i ? "#fff" : color, borderRadius: "4px 4px 0 0" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: MUTED, marginTop: 4 }}>
        <span>{data.length ? labelOf(data[0], 0) : ""}</span>
        <span>{data.length ? labelOf(data[data.length - 1], data.length - 1) : ""}</span>
      </div>
    </div>
  );
}

function Analytics({ api }: { api: ApiFn }) {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  const [person, setPerson] = useState<any>(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    setD(null); setErr("");
    api(`/ca/admin/analytics?days=${days}`).then(setD).catch((e) => setErr(e.message));
  }, [api, days]);

  const totals = useMemo(() => {
    if (!d) return null;
    const s = d.series || [];
    const sum = (k: string) => s.reduce((a: number, x: any) => a + (Number(x[k]) || 0), 0);
    return { views: sum("views"), quiz: sum("quiz"), new: sum("new"), locked: sum("locked") };
  }, [d]);

  if (err) return <Msg text={err} />;
  if (!d || !totals) return <div style={{ color: MUTED }}>Loading…</div>;
  const s = d.summary || {}, r = d.retention || {};
  const pct = (a: number, b: number) => (b ? `${Math.round((a * 100) / b)}%` : "—");
  const daysLeft = d.free_until ? Math.ceil((new Date(d.free_until + "T23:59:59+05:30").getTime() - Date.now()) / 86400000) : null;
  const names: Record<string, string> = d.block_names || {};

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[7, 30, 90].map((n) => <button key={n} onClick={() => setDays(n)} style={days === n ? goldBtn : btn}>{n} din</button>)}
      </div>

      <div style={{ ...box, fontSize: 13 }}>
        {d.free_now
          ? <>🎁 Free period: <b>{d.free_until}</b> tak{daysLeft !== null && <> — <b style={{ color: GOLD }}>{daysLeft} din baaki</b></>}. Ab tak <b>{r.total ?? 0}</b> log aaye, jinme <b>{r.logged_in ?? 0}</b> login wale.</>
          : <>🔒 Free period khatam ({d.free_until || "—"}).</>}
        {d.conversion && <div style={{ marginTop: 6, color: MUTED }}>Plan wale abhi: <b style={{ color: "#fff" }}>{d.conversion.active ?? 0}</b> · paise dekar liya: <b style={{ color: "#fff" }}>{d.conversion.paid_buyers}</b> (kul {d.conversion.buyers})</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
        <Tile label="🟢 Abhi online (5 min)" value={s.live_now ?? 0} color={GREEN} />
        <Tile label="Aaj (24 ghante)" value={s.v_24h ?? 0} sub={`${s.events_24h ?? 0} actions`} />
        <Tile label="Pichhle 7 din" value={s.v_7d ?? 0} sub="alag log" />
        <Tile label="Pichhle 30 din" value={s.v_30d ?? 0} sub="alag log" />
        <Tile label="Ab tak kul" value={s.v_all ?? 0} sub={`${r.logged_in ?? 0} login · ${r.app ?? 0} app`} />
        <Tile label={`Naye (${days} din)`} value={totals.new} />
        <Tile label={`Page views (${days} din)`} value={totals.views} />
        <Tile label={`Quiz diye (${days} din)`} value={totals.quiz}
          sub={Object.entries(d.quiz || {}).map(([k, v]: any) => `${k === "day" ? "Din" : "Block"}: ${v.attempts} · avg ${v.avg_pct ?? "—"}%`).join(" | ")} />
      </div>

      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontWeight: 800, flex: 1 }}>Roz kitne log aaye</div>
          <button onClick={() => setTable(!table)} style={{ ...btn, padding: "4px 8px", fontSize: 11 }}>{table ? "Chart" : "Table"}</button>
        </div>
        {table ? (
          <div style={{ maxHeight: 300, overflowY: "auto", fontSize: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(5, 1fr)", gap: 4, color: MUTED, fontWeight: 700, padding: "4px 0" }}>
              <span>Din</span><span>Log</span><span>Naye</span><span>Login</span><span>App</span><span>Quiz</span>
            </div>
            {[...d.series].reverse().map((x: any) => (
              <div key={x.day} style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(5, 1fr)", gap: 4, padding: "4px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span>{x.day.slice(5)}</span><span>{x.visitors}</span><span>{x.new}</span><span>{x.logged_in}</span><span>{x.app}</span><span>{x.quiz}</span>
              </div>
            ))}
          </div>
        ) : (
          <Bars data={d.series} valueKey="visitors" labelOf={(x) => x.day.slice(5)}
            tip={(x) => `${x.day}: ${x.visitors} log (${x.new} naye, ${x.logged_in} login, ${x.app} app) · ${x.views} views · ${x.quiz} quiz${x.quiz_avg != null ? ` (avg ${x.quiz_avg}%)` : ""}`} />
        )}
      </div>

      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Roz kitne quiz diye</div>
        <Bars data={d.series} valueKey="quiz" height={70} labelOf={(x) => x.day.slice(5)}
          tip={(x) => `${x.day}: ${x.quiz} quiz${x.quiz_avg != null ? ` · avg ${x.quiz_avg}%` : ""}`} />
      </div>

      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Wapas aane wale (kitne din aaye)</div>
        {[["2+ din", r.d2], ["5+ din", r.d5], ["10+ din", r.d10], ["30+ din", r.d30], ["Pichhle 7 din me aaye", r.active_7d]].map(([l, v]: any) => (
          <div key={l} style={{ marginBottom: 7 }}>
            <div style={{ display: "flex", fontSize: 12.5 }}><span style={{ flex: 1 }}>{l}</span><b>{v ?? 0}</b><span style={{ color: MUTED, width: 46, textAlign: "right" }}>{pct(v || 0, r.total || 0)}</span></div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, marginTop: 3 }}>
              <div style={{ height: 6, width: pct(v || 0, r.total || 0) === "—" ? 0 : pct(v || 0, r.total || 0), background: GOLD, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Kis samay padhte hain (IST, 30 din)</div>
        <Bars data={Array.from({ length: 24 }, (_, h) => ({ hour: h, ...(d.hourly.find((x: any) => x.hour === h) || { events: 0, visitors: 0 }) }))}
          valueKey="events" height={70} labelOf={(x) => `${x.hour}:00`} tip={(x) => `${x.hour}:00–${x.hour + 1}:00 — ${x.events} actions, ${x.visitors} log`} />
      </div>

      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Sabse zyada dekha gaya (30 din)</div>
        {(d.content || []).length === 0 && <div style={{ color: MUTED, fontSize: 12.5 }}>Abhi data nahi</div>}
        {(d.content || []).slice(0, 12).map((c: any, i: number) => (
          <div key={i} style={{ display: "flex", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ flex: 1 }}>{c.ca_month ? monthName(c.ca_month) : "—"}{c.block ? ` · B${c.block} ${names[c.block] || ""}` : " · Pura mahina / din"}</span>
            <span style={{ color: MUTED }}>{c.views} views · {c.visitors} log</span>
          </div>
        ))}
      </div>

      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Log kya-kya karte hain (30 din)</div>
        {(d.events || []).map((e: any) => (
          <div key={e.event} style={{ display: "flex", fontSize: 12.5, padding: "4px 0" }}>
            <span style={{ flex: 1 }}>{EVENT_NAME[e.event] || e.event}</span>
            <span style={{ color: MUTED }}>{e.total} baar · {e.visitors} log</span>
          </div>
        ))}
      </div>

      <PeopleList title="Sabse active log" people={d.top_users} onOpen={setPerson} />
      <PeopleList title="Naye aaye log" people={d.new_users} onOpen={setPerson} />
      {person && <PersonSheet api={api} p={person} onClose={() => setPerson(null)} />}
    </div>
  );
}

const EVENT_NAME: Record<string, string> = {
  view_home: "CA home khola", view_month: "Mahina / block padha", view_day: "Din ke cards padhe",
  quiz_start: "Quiz shuru kiya", quiz_submit: "Quiz submit kiya", locked: "Lock dekha (login/pass nahi)",
  open_card: "Card khola", share: "Share kiya", lang: "Bhasha badli", pdf: "PDF download", search: "Search", bookmark: "Bookmark",
};

function PeopleList({ title, people, onOpen }: { title: string; people: any[]; onOpen: (p: any) => void }) {
  return (
    <div style={box}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {(people || []).length === 0 && <div style={{ color: MUTED, fontSize: 12.5 }}>Abhi koi nahi</div>}
      {(people || []).map((p) => (
        <button key={p.visitor} onClick={() => onOpen(p)}
          style={{ ...btn, border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", borderRadius: 0, width: "100%", textAlign: "left", padding: "7px 0", fontWeight: 400 }}>
          <div style={{ display: "flex", gap: 8, fontSize: 12.5 }}>
            <span style={{ flex: 1, fontWeight: 700 }}>{p.name || (p.user_id ? `User #${p.user_id}` : "Bina login visitor")}</span>
            <span style={{ color: MUTED }}>{p.days_active} din · {p.quizzes} quiz{p.quiz_pct != null ? ` (${p.quiz_pct}%)` : ""}</span>
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
            {p.phone || p.email || p.visitor} · {p.platform || "web"} · pehli baar {fmtTime(p.first_seen)} · aakhri {fmtTime(p.last_seen)}
          </div>
        </button>
      ))}
    </div>
  );
}

function PersonSheet({ api, p, onClose }: { api: ApiFn; p: any; onClose: () => void }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/ca/admin/analytics/visitor/${encodeURIComponent(p.visitor)}`).then(setD).catch(() => setD({ events: [], attempts: [] })); }, [api, p]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#0d0b08", border: `1px solid ${BORDER}`, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ flex: 1, fontWeight: 800 }}>{p.name || p.visitor}</div>
          <button onClick={onClose} style={btn}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>{p.phone || ""} {p.email || ""} · {p.days_active} din aaye · {p.quizzes} quiz</div>
        {!d && <div style={{ color: MUTED }}>Loading…</div>}
        {d && (
          <>
            <div style={{ fontWeight: 800, fontSize: 13, margin: "6px 0" }}>Quiz</div>
            {(d.attempts || []).length === 0 && <div style={{ fontSize: 12, color: MUTED }}>Koi quiz nahi</div>}
            {(d.attempts || []).map((a: any, i: number) => (
              <div key={i} style={{ fontSize: 12, padding: "4px 0", display: "flex" }}>
                <span style={{ flex: 1 }}>{a.scope === "day" ? "Din" : "Block"} {a.scope_key}</span>
                <span>{a.correct}/{a.total} ✓ · {a.wrong} ✗ · {a.skipped} chhode</span>
                <span style={{ color: MUTED, marginLeft: 8 }}>{fmtTime(a.created_at)}</span>
              </div>
            ))}
            <div style={{ fontWeight: 800, fontSize: 13, margin: "12px 0 6px" }}>Kya-kya kiya (aakhri 200)</div>
            {(d.events || []).map((e: any, i: number) => (
              <div key={i} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8 }}>
                <span style={{ color: MUTED, width: 92, flexShrink: 0 }}>{fmtTime(e.created_at)}</span>
                <span style={{ flex: 1 }}>{EVENT_NAME[e.event] || e.event}{e.ca_date ? ` · ${e.ca_date}` : e.ca_month ? ` · ${e.ca_month}` : ""}{e.block ? ` B${e.block}` : ""}{e.meta?.correct != null ? ` · ${e.meta.correct}/${e.meta.total}` : ""}</span>
                <span style={{ color: MUTED }}>{e.platform}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PDF & ADS — student jo PDF download karte hain, uske andar ke ads
// ═══════════════════════════════════════════════════════════════════════════
type Ad = {
  id?: string; on: boolean; name?: string; image?: string; strip_image?: string; link?: string;
  title?: string; subtitle?: string; cta?: string; heading?: string; subheading?: string;
  positions: string[]; start?: string; end?: string; qr: boolean;
};
const POS: [string, string, string][] = [
  ["cover", "📘 Cover page", "Pehle page par, mentors ke neeche (bada)"],
  ["strip", "➖ Har page ki patti", "Har andar wale page ke neeche patli patti"],
  ["last", "🏁 Aakhri page", "Last page par poora bada ad + QR"],
];
const LINK_FIELDS: [string, string][] = [
  ["website", "https://selectionlab.in"], ["youtube", "https://youtube.com/@selection_lab"],
  ["telegram", "https://t.me/Selection_Lab"], ["practice", "https://selectionlab.in/current-affairs"],
];

function adStatus(a: Ad, today: string): [string, string] {
  if (!a.on) return ["Band", MUTED];
  if (a.start && today < a.start) return [`${a.start} se shuru`, YELLOW];
  if (a.end && today > a.end) return ["Khatam ho gaya", RED];
  return ["Aaj PDF me hai", GREEN];
}

function PdfAds({ api }: { api: ApiFn }) {
  const [d, setD] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [busy, setBusy] = useState("");
  const [pv, setPv] = useState<{ scope: string; month: string; block: string; kind: string }>({ scope: "block", month: "", block: "1", kind: "quick" });
  const [pvLink, setPvLink] = useState<{ url: string; name: string; kb: number } | null>(null);
  const [dirty, setDirty] = useState(false);

  function load() {
    api("/ca/admin/pdf").then((x) => {
      setD(x);
      setCfg({ enabled: true, mentors: true, ads: [], links: {}, ...(x.config || {}) });
      setPv((p) => ({ ...p, month: p.month || x.months?.[0] || "" }));
      setDirty(false);
    }).catch((e) => setMsg({ t: e.message }));
  }
  useEffect(load, [api]);

  const today = d?.today || "";
  const ads: Ad[] = cfg?.ads || [];
  function setAds(next: Ad[]) { setCfg({ ...cfg, ads: next }); setDirty(true); }
  function upd(i: number, patch: Partial<Ad>) { setAds(ads.map((a, j) => (j === i ? { ...a, ...patch } : a))); }
  function move(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= ads.length) return;
    const n = [...ads]; [n[i], n[j]] = [n[j], n[i]]; setAds(n); setOpen(j);
  }
  function addAd() {
    setAds([...ads, { on: true, name: `Ad ${ads.length + 1}`, positions: ["cover", "last"], qr: true }]);
    setOpen(ads.length);
  }

  function body() {
    const links: any = {};
    for (const [k] of LINK_FIELDS) if (cfg.links?.[k]) links[k] = cfg.links[k];
    return { enabled: !!cfg.enabled, mentors: !!cfg.mentors, ads, links };
  }

  async function save() {
    setMsg({ t: "" }); setBusy("save");
    try {
      const r = await api("/ca/admin/pdf", "PUT", body());
      setCfg({ ...cfg, ...r.config }); setDirty(false);
      setMsg({ t: "Save ho gaya. Naye ads wale PDF agle download par (ya 10 min me apne aap) ban jaayenge.", ok: true });
      load();
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy("");
  }

  async function preview() {
    setMsg({ t: "" }); setBusy("preview"); setPvLink(null);
    try {
      const key = pv.scope === "all" ? "all" : pv.scope === "block" ? `${pv.month}:${pv.block}` : pv.month;
      const r = await api("/ca/admin/pdf/preview", "POST", { scope: pv.scope, key, kind: pv.kind, config: body() });
      const bin = atob(r.pdf_b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: "application/pdf" }));
      setPvLink({ url, name: r.file_name, kb: r.size_kb });
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy("");
  }

  async function rebuild() {
    if (!confirm("Saare bane hue PDF hata kar naye banaye jaayenge. Chalu karein?")) return;
    setBusy("rebuild");
    try {
      const r = await api("/ca/admin/pdf/rebuild", "POST", {});
      setMsg({ t: `${r.removed} purani files hatayi. Naye PDF 10 min ke andar ban jaayenge.`, ok: true }); load();
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy("");
  }

  if (!d || !cfg) return msg.t ? <Msg text={msg.t} /> : <div style={{ color: MUTED }}>Loading…</div>;
  const chip = (on: boolean): CSSProperties => ({ ...btn, padding: "6px 10px", fontSize: 12, ...(on ? { background: `${GOLD}22`, borderColor: GOLD, color: GOLD } : {}) });

  return (
    <div>
      <Msg text={msg.t} ok={msg.ok} />

      {/* ── Haal ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
        <Tile label="PDF download (30 din)" value={d.downloads_30d} sub={`${d.people_30d} log`} />
        <Tile label="Ads aaj PDF me" value={ads.filter((a) => adStatus(a, today)[0] === "Aaj PDF me hai").length} sub={`kul ${ads.length}`} color={GREEN} />
        <Tile label="Bane hue PDF" value={(d.cache || []).length} sub="turant download hote hain" />
      </div>

      <div style={box}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, fontWeight: 700 }}>
          <input type="checkbox" checked={!!cfg.enabled} onChange={(e) => { setCfg({ ...cfg, enabled: e.target.checked }); setDirty(true); }} />
          Students ko "Download PDF" button dikhe
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 8 }}>
          <input type="checkbox" checked={!!cfg.mentors} onChange={(e) => { setCfg({ ...cfg, mentors: e.target.checked }); setDirty(true); }} />
          Cover par "Meet your mentors" (Ashutosh Sir, Ravi Sir, Nikki Ma'am)
        </label>
        <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.55 }}>
          Teen tarah ke PDF: <b>Quick Revision</b> (sirf one-liners), <b>Detailed Notes</b> (one-liner + Detail + Static GK),
          <b>MCQ Practice</b> (har block ke sawaal, phir Answer Key + poori explanation). Sab English + Hindi, cover → contents → andar → aakhri page par ad.
          Footer me website / YouTube / Telegram har page par clickable. Mahina, block aur din ke teeno; poore saal ka sirf Quick aur Notes (MCQ 600+ page ho jaata).
        </div>
      </div>

      {/* ── Ads ── */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ flex: 1, fontWeight: 800 }}>📢 PDF ke ads</div>
          <button onClick={addAd} style={goldBtn}>+ Naya ad</button>
        </div>
        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 8, lineHeight: 1.5 }}>
          Poora ad image clickable hota hai — student tap kare to aapka link khulta hai. Aakhri page par us link ka QR bhi chhapta hai.
          Ek jagah ke kai ad ho to: cover par sabse upar wala, har page ki patti baari-baari, aakhri page har ad ka ek page (3 tak).
        </div>
        {ads.length === 0 && <div style={{ color: MUTED, fontSize: 12.5, padding: "8px 0" }}>Abhi koi ad nahi — PDF me Selection Lab ka apna "Daily CA Quiz" box aayega.</div>}
        {ads.map((a, i) => {
          const [st, col] = adStatus(a, today);
          const isOpen = open === i;
          const big = a.positions.includes("cover") || a.positions.includes("last");
          return (
            <div key={a.id || i} style={{ border: `1px solid ${isOpen ? GOLD : "rgba(255,255,255,0.1)"}`, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
              <div onClick={() => setOpen(isOpen ? null : i)} style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, cursor: "pointer" }}>
                {a.image || a.strip_image
                  ? <img src={a.image || a.strip_image} alt="" style={{ width: 64, height: 42, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#000" }} />
                  : <div style={{ width: 64, height: 42, borderRadius: 6, background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", fontSize: 10, color: MUTED, flexShrink: 0 }}>TEXT</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name || a.title || `Ad ${i + 1}`}</div>
                  <div style={{ fontSize: 11.5, color: MUTED }}>{a.positions.map((p) => POS.find((x) => x[0] === p)?.[1].replace(/^\S+\s/, "")).join(" · ") || "jagah nahi chuni"}</div>
                </div>
                <span style={{ fontSize: 11, color: col, fontWeight: 800, whiteSpace: "nowrap" }}>● {st}</span>
              </div>
              {isOpen && (
                <div style={{ padding: "0 12px 12px" }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 700, margin: "4px 0 8px" }}>
                    <input type="checkbox" checked={a.on} onChange={(e) => upd(i, { on: e.target.checked })} /> Ad chalu hai
                  </label>
                  <div style={label}>Naam (sirf aapke liye)</div>
                  <input style={input} value={a.name || ""} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Clerk Tier 2 offer" />

                  <div style={label}>PDF me kahan dikhe</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {POS.map(([k, t, hint]) => (
                      <button key={k} title={hint} style={chip(a.positions.includes(k))}
                        onClick={() => upd(i, { positions: a.positions.includes(k) ? a.positions.filter((p) => p !== k) : [...a.positions, k] })}>{t}</button>
                    ))}
                  </div>

                  <div style={label}>Click karne par kya khule (link)</div>
                  <input style={input} value={a.link || ""} onChange={(e) => upd(i, { link: e.target.value })} placeholder="https://selectionlab.in/tier2" />

                  {big && (
                    <div style={{ marginTop: 10 }}>
                      <ImageField label="Bada ad image (cover + aakhri page)" value={a.image || ""} onChange={(v) => upd(i, { image: v })}
                        reqW={1300} reqH={867} where="PDF ke cover page par mentors ke neeche, aur aakhri page par poori chaudai me."
                        hint="Wahi poster jo WhatsApp par bhejte ho (3:2). Link/offer image ke andar bhi likh dijiye." />
                    </div>
                  )}
                  {a.positions.includes("strip") && (
                    <div style={{ marginTop: 10 }}>
                      <ImageField label="Patli patti image (har page ke neeche)" value={a.strip_image || ""} onChange={(v) => upd(i, { strip_image: v })}
                        reqW={1200} reqH={100} where="PDF ke har andar wale page ke neeche, footer ke upar."
                        hint="Bahut patli (12:1). Image na ho to neeche ka title + button wali patti apne aap banti hai." />
                    </div>
                  )}

                  <div style={{ fontWeight: 800, fontSize: 12.5, margin: "12px 0 0" }}>Text ad (image na ho tab ke liye)</div>
                  <div style={label}>Title</div>
                  <input style={input} value={a.title || ""} onChange={(e) => upd(i, { title: e.target.value })} placeholder="Clerk Tier 2 — Typing + Excel Pack" />
                  <div style={label}>Ek line</div>
                  <input style={input} value={a.subtitle || ""} onChange={(e) => upd(i, { subtitle: e.target.value })} placeholder="Free practice se shuru kariye — 50% OFF" />
                  <div style={label}>Button par</div>
                  <input style={input} value={a.cta || ""} onChange={(e) => upd(i, { cta: e.target.value })} placeholder="selectionlab.in/tier2" />

                  {a.positions.includes("last") && (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 12.5, margin: "12px 0 0" }}>Aakhri page ki heading (khaali = KEEP PRACTISING WITH SELECTION LAB)</div>
                      <input style={{ ...input, marginTop: 4 }} value={a.heading || ""} onChange={(e) => upd(i, { heading: e.target.value })} placeholder="KEEP PRACTISING WITH SELECTION LAB" />
                      <input style={{ ...input, marginTop: 6 }} value={a.subheading || ""} onChange={(e) => upd(i, { subheading: e.target.value })} placeholder="Mock tests, typing aur Excel practice — sab ek jagah" />
                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 8 }}>
                        <input type="checkbox" checked={a.qr} onChange={(e) => upd(i, { qr: e.target.checked })} /> Aakhri page par link ka QR code
                      </label>
                    </>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><div style={label}>Kab se (khaali = abhi se)</div>
                      <input type="date" style={input} value={a.start || ""} onChange={(e) => upd(i, { start: e.target.value || undefined })} /></div>
                    <div><div style={label}>Kab tak (khaali = hamesha)</div>
                      <input type="date" style={input} value={a.end || ""} onChange={(e) => upd(i, { end: e.target.value || undefined })} /></div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    <button style={btn} onClick={() => move(i, -1)} disabled={i === 0}>↑ Upar</button>
                    <button style={btn} onClick={() => move(i, 1)} disabled={i === ads.length - 1}>↓ Neeche</button>
                    <div style={{ flex: 1 }} />
                    <button style={{ ...btn, color: RED, borderColor: `${RED}66` }}
                      onClick={() => { if (confirm("Ye ad hata dein?")) { setAds(ads.filter((_, j) => j !== i)); setOpen(null); } }}>🗑 Hatao</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Links ── */}
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>🔗 Footer ke links (har page par clickable)</div>
        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 4 }}>Khaali chhodo to neeche likhe default chalenge.</div>
        {LINK_FIELDS.map(([k, ph]) => (
          <div key={k}>
            <div style={label}>{k === "practice" ? "Practice page (QR / Daily quiz box)" : k[0].toUpperCase() + k.slice(1)}</div>
            <input style={input} value={cfg.links?.[k] || ""} placeholder={ph}
              onChange={(e) => { setCfg({ ...cfg, links: { ...(cfg.links || {}), [k]: e.target.value } }); setDirty(true); }} />
          </div>
        ))}
      </div>

      {/* ── Preview + Save ── */}
      <div style={{ ...box, position: "sticky", bottom: 8, zIndex: 5, boxShadow: "0 -6px 24px rgba(0,0,0,0.5)" }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>👁️ Save se pehle dekh lo</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select value={pv.kind} onChange={(e) => setPv({ ...pv, kind: e.target.value, scope: e.target.value === "mcq" && pv.scope === "all" ? "block" : pv.scope })} style={{ ...input, width: "auto" }}>
            {Object.entries(KIND_NAME).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
          <select value={pv.scope} onChange={(e) => setPv({ ...pv, scope: e.target.value })} style={{ ...input, width: "auto" }}>
            <option value="block">Ek block (jaldi)</option>
            <option value="month">Poora mahina</option>
            {pv.kind !== "mcq" && <option value="all">Poora saal</option>}
          </select>
          {pv.scope !== "all" && (
            <select value={pv.month} onChange={(e) => setPv({ ...pv, month: e.target.value })} style={{ ...input, width: "auto" }}>
              {(d.months || []).map((m: string) => <option key={m} value={m}>{monthName(m)}</option>)}
            </select>
          )}
          {pv.scope === "block" && (
            <select value={pv.block} onChange={(e) => setPv({ ...pv, block: e.target.value })} style={{ ...input, width: "auto" }}>
              {Array.from({ length: 10 }, (_, k) => <option key={k} value={String(k + 1)}>Block {k + 1}</option>)}
            </select>
          )}
          <button onClick={preview} style={btn} disabled={!!busy || (!pv.month && pv.scope !== "all")}>{busy === "preview" ? "Ban raha hai…" : "Preview PDF"}</button>
          <div style={{ flex: 1 }} />
          <button onClick={save} style={goldBtn} disabled={!!busy}>{busy === "save" ? "Saving…" : dirty ? "💾 Save karo" : "Save"}</button>
        </div>
        {pvLink && (
          <div style={{ marginTop: 8, fontSize: 12.5 }}>
            ✅ {pvLink.name} · {pvLink.kb} KB —{" "}
            <a href={pvLink.url} target="_blank" rel="noreferrer" style={{ color: GOLD, fontWeight: 800 }}>Kholo</a>{" · "}
            <a href={pvLink.url} download={pvLink.name} style={{ color: GOLD, fontWeight: 800 }}>Download</a>
          </div>
        )}
        {dirty && <div style={{ fontSize: 11.5, color: YELLOW, marginTop: 6 }}>Badlav abhi save nahi hue — preview me dikhte hain, students ko save ke baad.</div>}
      </div>

      {/* ── Kaunsa PDF kitna ── */}
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Sabse zyada download (30 din)</div>
        {(d.top || []).length === 0 && <div style={{ color: MUTED, fontSize: 12.5 }}>Abhi koi download nahi</div>}
        {(d.top || []).map((r: any) => (
          <div key={r.key} style={{ display: "flex", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ flex: 1 }}>{pdfKeyName(r.key)}</span>
            <span style={{ color: MUTED }}>{r.downloads} baar · {r.people} log</span>
          </div>
        ))}
      </div>

      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ flex: 1, fontWeight: 800 }}>Bane hue PDF (server par tayyar)</div>
          <button onClick={rebuild} style={btn} disabled={!!busy}>♻️ Sab dobara banao</button>
        </div>
        {(d.cache || []).length === 0 && <div style={{ color: MUTED, fontSize: 12.5 }}>Abhi koi nahi — har 10 min published mahino ke PDF apne aap bante hain.</div>}
        {(d.cache || []).map((m: any, i: number) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ flex: 1 }}>{pdfKeyName(`${m.scope}:${m.key}|${m.kind || "quick"}`)}</span>
            <span style={{ color: MUTED }}>{m.pages} page · {m.size_kb} KB · {m.build_sec}s · {fmtTime(m.built_at)}</span>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
          Card edit / upload / publish ya ad badalte hi PDF apne aap naya banta hai — kuch dabana nahi padta. Ye button sirf tab jab koi PDF ajeeb dikhe.
        </div>
      </div>
    </div>
  );
}

const KIND_NAME: Record<string, string> = { quick: "⚡ Quick Revision", notes: "📖 Detailed Notes", mcq: "📝 MCQ Practice" };

function pdfKeyName(k: string) {
  const [where, kind] = k.split("|");
  const [scope, ...rest] = where.split(":");
  const key = rest.join(":");
  let w = where;
  if (scope === "all") w = "📚 Poora saal";
  else if (scope === "month") w = `🗓 ${monthName(key)}`;
  else if (scope === "block") { const [m, b] = key.split(":"); w = `🧩 ${monthName(m)} · Block ${b}`; }
  else if (scope === "day") w = `📅 ${key}`;
  return `${w} · ${(KIND_NAME[kind || "quick"] || kind).replace(/^\S+\s/, "")}`;
}
