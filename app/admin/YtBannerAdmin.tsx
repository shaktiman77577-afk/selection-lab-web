"use client";

/**
 * app/admin/YtBannerAdmin.tsx — YouTube channel banner (sirf Main Admin).
 *
 * Backend: selection-lab-api routers/yt_banner.py
 *  - har 6 ghante subscriber count, bar 5%+ badle ya target badle → naya banner seedha YouTube par
 *  - target niyam: bar hamesha 50%+ (10K → 15K → 25K ...)
 *  - yahan: Connect YouTube, text badlo, preview, Upload now, auto ON/OFF, purana banner Restore
 *  - saari details (contact, title, progress, exam chips) phone par dikhne wale hisse me
 *  - milestone poora (10K) → "THANK YOU FOR 10K SUBSCRIBERS" banner kuch din, phir wapas progress (15K)
 */

import { useEffect, useState, type CSSProperties } from "react";

type Api = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";

const input: CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 14, boxSizing: "border-box",
};
const btn: CSSProperties = {
  background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10,
  padding: "10px 14px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
};
const goldBtn: CSSProperties = { ...btn, background: GOLD, color: "#1a1a1a", border: "none", fontWeight: 800 };
const box: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12 };
const label: CSSProperties = { fontSize: 11.5, color: MUTED, fontWeight: 700, margin: "10px 0 4px" };
const h: CSSProperties = { fontWeight: 800, fontSize: 15, marginBottom: 6 };

const ICON_NAME: Record<string, string> = { bank: "🏛️ Bank", book: "📖 Book", people: "👥 People", cap: "🎓 Cap", doc: "📄 Doc" };
const SOURCE: Record<string, string> = { auto: "Apne aap", manual: "Upload now", restore: "Restore" };

const when = (t?: string | null) =>
  t ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const kfmt = (n?: number | null) => {
  if (!n) return "—";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
};

type Exam = { label: string; icon: string };
type Settings = {
  title: string; tagline: string; phone: string; website: string; telegram: string; exams: Exam[];
  celebrate_title: string; celebrate_text: string; celebrate_note: string;
};

export default function YtBannerAdmin({ api }: { api: Api }) {
  const [st, setSt] = useState<any | null>(null);
  const [form, setForm] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState<any | null>(null);
  const [pvKind, setPvKind] = useState<"progress" | "celebrate">("progress");
  const [guides, setGuides] = useState(true);
  const [targetInput, setTargetInput] = useState("");

  function load() {
    setErr("");
    api("/yt-banner/admin/status")
      .then((d) => { setSt(d); setForm(d.settings); setDirty(false); setTargetInput(d.target ? String(d.target) : ""); })
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    // Google se wapas aaye? (?yt=connected / ?yt=error&msg=...)
    try {
      const q = new URLSearchParams(window.location.search);
      const yt = q.get("yt");
      if (yt === "connected") setMsg({ text: "✅ YouTube connect ho gaya", ok: true });
      if (yt === "error") setMsg({ text: q.get("msg") || "YouTube connect nahi hua", ok: false });
      if (yt || q.get("tab")) window.history.replaceState(window.history.state, "", "/admin");
    } catch {}
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(name: string, fn: () => Promise<any>, okText?: string) {
    setBusy(name); setMsg(null);
    try {
      const r = await fn();
      if (okText) setMsg({ text: okText, ok: true });
      return r;
    } catch (e: any) {
      setMsg({ text: e.message || "Kuch galat hua", ok: false });
    } finally {
      setBusy("");
    }
  }

  function setF(patch: Partial<Settings>) {
    if (!form) return;
    setForm({ ...form, ...patch });
    setDirty(true);
  }

  async function save(extra: any = {}, okText = "Save ho gaya") {
    const d = await run("save", () => api("/yt-banner/admin/settings", "PUT", extra), okText);
    if (d) { setSt((s: any) => ({ ...s, ...d })); if (extra.settings) setDirty(false); if (d.target) setTargetInput(String(d.target)); }
    return d;
  }

  async function makePreview(kind: "progress" | "celebrate" = pvKind) {
    setPvKind(kind);
    const d = await run("preview", () => api("/yt-banner/admin/preview", "POST", { settings: form, refresh_count: true, kind }));
    if (d) setPreview(d);
  }

  async function endCelebration() {
    if (!confirm("Celebration abhi khatam karke progress banner lagayein?")) return;
    const d = await run("endcel", () => api("/yt-banner/admin/end-celebration", "POST"), "Celebration khatam, progress banner laga");
    if (d) load();
  }

  async function connect() {
    const d = await run("connect", () => api("/yt-banner/admin/connect-url"));
    if (d?.url) window.location.href = d.url;
  }

  async function uploadNow() {
    if (dirty && !confirm("Text ke badlav abhi save nahi hue. Pehle save karke upload karein?")) return;
    if (dirty) { const ok = await save({ settings: form }); if (!ok) return; }
    if (!confirm("Abhi ka banner YouTube channel par laga dein?")) return;
    const d = await run("upload", () => api("/yt-banner/admin/upload-now", "POST"), "✅ Banner YouTube par lag gaya");
    if (d) load();
  }

  async function restore(v: any) {
    if (!confirm(`${when(v.created_at)} wala banner wapas YouTube par lagayein? Auto-upload band ho jayega — galti theek karke dobara ON kariyega.`)) return;
    const d = await run("restore" + v.id, () => api(`/yt-banner/admin/restore/${v.id}`, "POST"), "✅ Purana banner wapas lag gaya, auto-upload OFF");
    if (d) load();
  }

  async function disconnect() {
    if (!confirm("YouTube disconnect karein? Phir banner apne aap nahi lagega.")) return;
    const d = await run("disconnect", () => api("/yt-banner/admin/disconnect", "POST"), "Disconnect ho gaya");
    if (d) load();
  }

  if (err) return <div style={{ ...box, color: RED }}>{err}</div>;
  if (!st || !form) return <div style={{ color: MUTED, padding: 10 }}>Load ho raha hai…</div>;

  const envMissing = [
    !st.env.api_key && "YOUTUBE_API_KEY",
    !st.env.channel_id && "YOUTUBE_CHANNEL_ID",
    !st.env.oauth && "GOOGLE_OAUTH_CLIENT_ID / SECRET",
  ].filter(Boolean);
  const live = (st.history || []).find((v: any) => v.status === "live");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {msg && (
        <div style={{ ...box, borderColor: msg.ok ? `${GREEN}66` : `${RED}66`, color: msg.ok ? GREEN : RED, fontWeight: 700, fontSize: 13.5 }}>
          {msg.text}
        </div>
      )}

      {/* ── Haal ── */}
      <div style={box}>
        <div style={h}>📺 YouTube</div>
        {envMissing.length > 0 && (
          <div style={{ color: RED, fontSize: 13, marginBottom: 8 }}>
            Railway me ye set nahi hai: <b>{envMissing.join(", ")}</b>
          </div>
        )}
        {st.connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ color: GREEN, fontWeight: 800 }}>● Connected</span>
            <span style={{ fontSize: 13.5 }}>{st.channel_title || "Channel"}</span>
            <span style={{ fontSize: 12, color: MUTED }}>({when(st.connected_at)})</span>
            <button style={{ ...btn, padding: "6px 10px", fontSize: 12, marginLeft: "auto" }} onClick={disconnect} disabled={!!busy}>
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>
              Banner lagane ke liye channel ka Google account connect kariye. Login par &quot;Google hasn&apos;t verified this app&quot; aaye to
              Advanced → Continue dabaiye.
            </div>
            <button style={goldBtn} onClick={connect} disabled={!!busy || !st.env.oauth}>
              {busy === "connect" ? "Khul raha hai…" : "Connect YouTube"}
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 14 }}>
          <Stat k="Subscribers" v={st.last_subs ? st.last_subs.toLocaleString("en-IN") : "—"} />
          <Stat k="Target" v={kfmt(st.target)} />
          <Stat k="Bar" v={st.percent != null ? `${st.percent}%` : "—"} />
          <Stat k="Live banner" v={live?.kind === "celebrate" ? "🎉 Thank you" : live?.percent != null ? `${live.percent}%` : live ? "Restore" : "—"} />
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
          Aakhri jaanch: {when(st.last_checked_at)} · har {st.check_every_hours} ghante
        </div>
        {st.celebrating && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255,171,0,0.1)", fontSize: 13,
            display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span>🎉 <b style={{ color: GOLD }}>{kfmt(st.celebrate_milestone)}</b> celebration chal raha hai — {when(st.celebrate_until)} tak,
              phir apne aap progress banner ({kfmt(st.target)} target)</span>
            <button style={{ ...btn, padding: "6px 10px", fontSize: 12, marginLeft: "auto" }} onClick={endCelebration} disabled={!!busy}>
              {busy === "endcel" ? "…" : "Abhi khatam karo"}
            </button>
          </div>
        )}
        {st.last_error && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "rgba(255,107,107,0.1)", color: RED, fontSize: 13 }}>
            ⚠️ {st.last_error} <span style={{ color: MUTED }}>({when(st.last_error_at)})</span>
          </div>
        )}
      </div>

      {/* ── Auto ── */}
      <div style={box}>
        <div style={h}>⚙️ Apne aap update</div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
          <input type="checkbox" checked={!!st.auto_upload} disabled={busy === "save"}
            onChange={(e) => save({ auto_upload: e.target.checked }, e.target.checked ? "Auto-upload ON" : "Auto-upload OFF")} />
          <b style={{ color: st.auto_upload ? GREEN : RED }}>Auto-upload {st.auto_upload ? "ON" : "OFF"}</b>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={label}>Bar kitna badle tab naya banner</div>
            <select style={input} value={st.threshold} onChange={(e) => save({ threshold: Number(e.target.value) })}>
              {[3, 5, 10].map((n) => <option key={n} value={n}>{n}%</option>)}
            </select>
          </div>
          <div>
            <div style={label}>Target (subscribers)</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input style={input} inputMode="numeric" value={targetInput}
                onChange={(e) => setTargetInput(e.target.value.replace(/[^0-9]/g, ""))} />
              <button style={btn} disabled={!targetInput || Number(targetInput) === st.target || busy === "save"}
                onClick={() => save({ target: Number(targetInput) }, "Target badal gaya")}>Set</button>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
          Target cross hote hi agla target apne aap (×1.5, jaise 10K → 15K → 25K). Bar kabhi 50% se neeche nahi jaata.
        </div>

        <div style={label}>🎉 Milestone poora hone par THANK YOU banner kitne din</div>
        {st.celebrate_ready ? (
          <select style={{ ...input, maxWidth: 200 }} value={st.celebrate_days}
            onChange={(e) => save({ celebrate_days: Number(e.target.value) }, "Celebration ke din badal gaye")}>
            {[1, 2, 3, 5, 7].map((n) => <option key={n} value={n}>{n} din</option>)}
          </select>
        ) : (
          <div style={{ fontSize: 12.5, color: RED }}>
            Celebration ke liye Supabase me <b>2026-10-16_yt_banner_celebrate.sql</b> chalaiye.
          </div>
        )}
      </div>

      {/* ── Text ── */}
      <div style={box}>
        <div style={h}>✏️ Banner ka text</div>
        <Field l="Title" v={form.title} on={(v) => setF({ title: v })} />
        <Field l="Tagline" v={form.tagline} on={(v) => setF({ tagline: v })} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <Field l="Phone" v={form.phone} on={(v) => setF({ phone: v })} />
          <Field l="Website" v={form.website} on={(v) => setF({ website: v })} />
          <Field l="Telegram" v={form.telegram} on={(v) => setF({ telegram: v })} />
        </div>

        <div style={label}>Exam chips (max {st.max_exams})</div>
        {form.exams.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input style={{ ...input, flex: 1 }} value={e.label} maxLength={14}
              onChange={(ev) => setF({ exams: form.exams.map((x, j) => (j === i ? { ...x, label: ev.target.value.toUpperCase() } : x)) })} />
            <select style={{ ...input, width: 130 }} value={e.icon}
              onChange={(ev) => setF({ exams: form.exams.map((x, j) => (j === i ? { ...x, icon: ev.target.value } : x)) })}>
              {(st.icons || []).map((ic: string) => <option key={ic} value={ic}>{ICON_NAME[ic] || ic}</option>)}
            </select>
            <button style={{ ...btn, padding: "6px 12px" }} onClick={() => setF({ exams: form.exams.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        {form.exams.length < st.max_exams && (
          <button style={{ ...btn, padding: "7px 12px", fontSize: 12.5 }}
            onClick={() => setF({ exams: [...form.exams, { label: "", icon: "book" }] })}>+ Exam</button>
        )}

        <div style={{ ...h, marginTop: 18 }}>🎉 THANK YOU banner ka text</div>
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          <b style={{ color: GOLD }}>{"{target}"}</b> = jo milestone poora hua (10K) ·{" "}
          <b style={{ color: GOLD }}>{"{next}"}</b> = agla target (15K)
        </div>
        <Field l="Badi heading" v={form.celebrate_title} on={(v) => setF({ celebrate_title: v })} />
        <Field l="Doosri line" v={form.celebrate_text} on={(v) => setF({ celebrate_text: v })} />
        <Field l="Chhoti line" v={form.celebrate_note} on={(v) => setF({ celebrate_note: v })} />

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button style={goldBtn} disabled={!dirty || busy === "save"} onClick={() => save({ settings: form })}>
            {busy === "save" ? "Save ho raha hai…" : dirty ? "Save" : "Saved"}
          </button>
          <button style={btn} onClick={() => { setForm(st.settings); setDirty(false); }} disabled={!dirty}>Badlav hatao</button>
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
          Text save karne se banner turant nahi badalta — YouTube par lagane ke liye neeche &quot;Upload now&quot; dabaiye.
        </div>
      </div>

      {/* ── Preview + Upload ── */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ ...h, marginBottom: 0, flex: 1 }}>👀 Preview</div>
          <button style={pvKind === "progress" && preview ? { ...btn, borderColor: GOLD } : btn}
            onClick={() => makePreview("progress")} disabled={busy === "preview"}>
            {busy === "preview" && pvKind === "progress" ? "Ban raha hai…" : "Progress"}
          </button>
          <button style={pvKind === "celebrate" && preview ? { ...btn, borderColor: GOLD } : btn}
            onClick={() => makePreview("celebrate")} disabled={busy === "preview"}>
            {busy === "preview" && pvKind === "celebrate" ? "Ban raha hai…" : "🎉 Thank you"}
          </button>
          <button style={goldBtn} onClick={uploadNow} disabled={!!busy || !st.connected}>
            {busy === "upload" ? "Lag raha hai…" : "Upload now"}
          </button>
        </div>
        {preview && (
          <>
            <div style={{ position: "relative", marginTop: 12, borderRadius: 10, overflow: "hidden", aspectRatio: "16 / 9", background: "#000" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${preview.image_b64}`} alt="Banner preview" style={{ width: "100%", display: "block" }} />
              {guides && (
                <>
                  {/* Mobile: x 507–2053 of 2560 */}
                  <div style={{ position: "absolute", top: "35.28%", height: "29.38%", left: "19.8%", width: "60.4%", border: "2px dashed #5dd97c" }} />
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: MUTED, marginTop: 8 }}>
              <span>{preview.kind === "celebrate"
                ? `THANK YOU ${preview.milestone_label} · next ${preview.target_label}`
                : `${preview.subs?.toLocaleString("en-IN")} subscribers · target ${preview.target_label} · bar ${preview.percent}%`}</span>
              <label style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer", marginLeft: "auto" }}>
                <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
                <span><span style={{ color: GREEN }}>Mobile</span> me dikhne wala hissa</span>
              </label>
            </div>
            {preview.note && <div style={{ fontSize: 12, color: "#f2c94c", marginTop: 6 }}>{preview.note}</div>}
          </>
        )}
        {!st.connected && <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Upload ke liye pehle YouTube connect kariye.</div>}
      </div>

      {/* ── History ── */}
      <div style={box}>
        <div style={h}>🕘 Pichhle banner</div>
        {(st.history || []).length === 0 && <div style={{ fontSize: 13, color: MUTED }}>Abhi koi banner nahi laga.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {(st.history || []).map((v: any) => (
            <div key={v.id} style={{ border: `1px solid ${v.status === "live" ? GREEN : "rgba(255,255,255,0.12)"}`, borderRadius: 12, overflow: "hidden" }}>
              {v.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.image_url} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ aspectRatio: "16 / 9", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 12 }}>
                  Image save nahi hui
                </div>
              )}
              <div style={{ padding: 10, fontSize: 12.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <b style={{ color: v.status === "live" ? GREEN : v.status === "failed" ? RED : "#fff" }}>
                    {v.status === "live" ? "● Live" : v.status === "failed" ? "✕ Fail" : "Purana"}
                  </b>
                  <span style={{ color: MUTED }}>{when(v.created_at)}</span>
                </div>
                <div style={{ color: MUTED, marginTop: 3 }}>
                  {v.kind === "celebrate" && "🎉 Thank you · "}
                  {SOURCE[v.source] || v.source}
                  {v.percent != null && ` · ${v.percent}% of ${kfmt(v.target)}`}
                </div>
                {v.error && <div style={{ color: RED, marginTop: 4 }}>{v.error}</div>}
                {v.status !== "live" && v.image_url && (
                  <button style={{ ...btn, width: "100%", marginTop: 8, padding: "7px 10px" }}
                    disabled={!!busy || !st.connected} onClick={() => restore(v)}>
                    {busy === "restore" + v.id ? "Lag raha hai…" : "↩ Restore"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{k}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: GOLD }}>{v}</div>
    </div>
  );
}

function Field({ l, v, on }: { l: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <div style={label}>{l}</div>
      <input style={input} value={v} maxLength={80} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
