"use client";

/**
 * Tier2Admin.tsx — Selection Lab admin: Tier 2 Practice (typing + Excel/CPT).
 * Admin panel ke dark inline-style theme jaisa hi.
 * app/admin/page.tsx me "tier2" tab ke roop me juda hai: <Tier2Admin api={api} />
 *
 * Endpoints (base = /tier2/admin):
 *   GET/POST/PUT/DELETE  /series
 *   GET/POST/PUT/DELETE  /passages     ·  POST /passages/bulk
 *
 * parseCSV yahan apni copy me hai (page.tsx wali export nahi hoti). Repo ka
 * style bhi yahi hai — har bada component self-contained.
 */

import { useState, useEffect, type ReactNode, type CSSProperties } from "react";
import ImageField from "./ImageField";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";

const inputStyle: CSSProperties = {
  width: "100%", padding: "11px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.4)",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
};
const goldBtn: CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10,
  padding: "11px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`,
  borderRadius: 10, padding: "8px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const dangerBtn: CSSProperties = {
  background: "transparent", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const cardBox: CSSProperties = {
  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14,
};
const rowCard: CSSProperties = {
  ...cardBox, display: "flex", alignItems: "center", justifyContent: "space-between",
  gap: 10, marginBottom: 10,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

/** Excel/Sheets se paste karo to TAB, .csv file me comma — pehli line dekh kar khud pakadta hai. */
function parseCSV(text: string): string[][] {
  const firstLine = (text.split(/\r?\n/).find((l) => l.trim() !== "") || "");
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const SEP = tabCount >= commaCount && tabCount > 0 ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === SEP) {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

// ===========================================================================
export default function Tier2Admin({ api }: { api: ApiFn }) {
  const [level, setLevel] = useState<"series" | "passages">("series");
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [passages, setPassages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadSeries() {
    setLoading(true); setError("");
    try {
      const res = await api("/tier2/admin/series", "GET");
      setSeriesList(res?.series || []);
    } catch (e: any) { setError(e?.message || "Could not load the series."); }
    finally { setLoading(false); }
  }

  async function loadPassages(seriesId: number) {
    setLoading(true); setError("");
    try {
      const res = await api(`/tier2/admin/passages?series_id=${seriesId}`, "GET");
      setPassages(res?.passages || []);
    } catch (e: any) { setError(e?.message || "Could not load the passages."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadSeries(); /* eslint-disable-next-line */ }, []);

  const crumbBtn = (on: boolean): CSSProperties => ({
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontSize: 13, fontWeight: on ? 800 : 600, color: on ? "#fff" : MUTED,
  });

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Tier 2 Practice</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => { setActive(null); setLevel("series"); }} style={crumbBtn(level === "series")}>Series</button>
        {active && (<>
          <span style={{ color: MUTED }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{active.title}</span>
        </>)}
      </div>

      {error ? (
        <p style={{ color: "#ff6b6b", fontSize: 13, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>{error}</p>
      ) : null}

      {loading ? (
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      ) : level === "series" ? (
        <SeriesLevel
          api={api} list={seriesList} busy={busy} setBusy={setBusy} reload={loadSeries}
          onOpen={(s: any) => { setActive(s); setLevel("passages"); loadPassages(s.id); }}
        />
      ) : (
        <PassagesLevel
          api={api} series={active} list={passages} busy={busy} setBusy={setBusy}
          reload={() => loadPassages(active.id)}
        />
      )}

      {level === "series" && !loading && (
        <>
          <RecomputePanel api={api} />
          <FeedbackPanel api={api} />
        </>
      )}
    </div>
  );
}

// ── Students ka typing feedback ─────────────────────────────────────────────
// Result screen ke "Feedback" button se aata hai (rating 1-5 + message).
// Pehle ye kahin save hi nahi hota tha. Button dabane par hi load hota hai —
// har baar Tier 2 kholne par list khinchne ki zaroorat nahi.
function FeedbackPanel({ api }: { api: ApiFn }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setBusy(true); setErr("");
    try {
      const d = await api("/tier2/admin/typing/feedback?limit=100");
      setRows(d?.feedback || []);
    } catch (e: any) {
      setErr(e?.message || "Could not load feedback.");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ ...cardBox, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, flex: 1 }}>Student feedback (typing)</h3>
        <button onClick={load} disabled={busy} style={ghostBtn}>
          {busy ? "Loading…" : rows ? "Refresh" : "Show"}
        </button>
      </div>
      {err ? <p style={{ color: "#ff6b6b", fontSize: 12.5, margin: "10px 0 0" }}>{err}</p> : null}
      {rows && rows.length === 0 ? (
        <p style={{ fontSize: 12.5, color: MUTED, margin: "10px 0 0" }}>Abhi koi feedback nahi aaya.</p>
      ) : null}
      {rows && rows.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          {rows.map((r: any) => (
            <div key={r.id} style={{ borderTop: `1px solid ${BORDER}`, padding: "9px 0", fontSize: 12.5, lineHeight: 1.6 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: MUTED }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>
                  {r.rating ? "★".repeat(r.rating) + "☆".repeat(5 - r.rating) : "no rating"}
                </span>
                <span>{r.passage_title}</span>
                <span>· user #{r.user_id ?? "?"}</span>
                <span>· {r.created_at ? new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}</span>
              </div>
              {r.message ? <div style={{ marginTop: 3, whiteSpace: "pre-wrap" }}>{r.message}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Purane typing results dobara jodna (Recompute) ─────────────────────────
//
// Saved attempts ko student ke typed text se AAJ ke niyam se dobara score
// karta hai. Kab chalana hai: scoring me bug theek hone ke baad, ya kisi
// passage ka niyam badalne ke baad (jaise SKAU NTPC se Standard par aaya).
//
// Mode chuniye to sirf wahi passages chhue jaate hain — SKAU ke liye
// "Standard" chuniye, P&H aur NCERT ke attempts ko haath bhi nahi lagega.
//
// Deploy par apne aap nahi chalta — jaan-boojh kar. Pehle "Check first"
// dabaiye (kuch likhta nahi, sirf ginti batata hai), phir asli run.
function RecomputePanel({ api }: { api: ApiFn }) {
  const [running, setRunning] = useState<"" | "dry" | "real">("");
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState("standard");

  async function run(dry: boolean) {
    if (!dry && !confirm(
      "This rewrites the saved scores of past typing attempts using the current " +
      "rules. Run the check first if you haven't. Continue?"
    )) return;
    setRunning(dry ? "dry" : "real"); setErr(""); setRes(null);
    try {
      setRes(await api(`/tier2/admin/typing/recompute?dry=${dry ? 1 : 0}&mode=${encodeURIComponent(mode)}`, "POST", {}));
    } catch (e: any) {
      setErr(e?.message || "Could not run the recompute.");
    } finally { setRunning(""); }
  }

  const fmt = (x: any) =>
    `${x?.accuracy ?? "—"}% / ${x?.net_wpm ?? "—"} wpm${Number(x?.marks) > 0 ? ` / ${x.marks} marks` : ""}`;

  return (
    <div style={{ ...cardBox, marginTop: 22 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>Recompute old typing results</h3>
      <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, margin: "0 0 12px" }}>
        Re-scores saved attempts from the text each student actually typed, using today&apos;s
        rules. Run it after a scoring fix, or after changing a passage&apos;s rules (SKAU moved
        from NTPC to Standard: choose Standard). Safe to run more than once.
      </p>

      <Field label="Which passages">
        <select style={inputStyle} value={mode} onChange={(e) => { setMode(e.target.value); setRes(null); }}>
          <option value="standard">Standard only (SKAU, NBEMS)</option>
          <option value="word">Correct words only (P&amp;H)</option>
          <option value="keystroke">Keystrokes only (NCERT)</option>
          <option value="ntpc">RRB NTPC only</option>
          <option value="">All passages</option>
        </select>
      </Field>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => run(true)} disabled={!!running} style={ghostBtn}>
          {running === "dry" ? "Checking…" : "Check first (no changes)"}
        </button>
        <button onClick={() => run(false)} disabled={!!running} style={goldBtn}>
          {running === "real" ? "Recomputing…" : "Recompute now"}
        </button>
      </div>

      {err ? (
        <p style={{ color: "#ff6b6b", fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>{err}</p>
      ) : null}

      {res ? (
        <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 800, color: res.dry_run ? GOLD : "#4ade80" }}>
            {res.dry_run ? "Check only — nothing was written" : "Done"}
          </div>
          <div style={{ color: MUTED }}>{res.message}</div>
          {Array.isArray(res.examples) && res.examples.length > 0 && (
            <div style={{ marginTop: 8, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
              <div style={{ color: MUTED, marginBottom: 4 }}>Examples:</div>
              {res.examples.map((x: any) => (
                <div key={x.attempt_id} style={{ fontFamily: "monospace", fontSize: 11.5 }}>
                  #{x.attempt_id}: {fmt(x.before)}
                  {" → "}
                  <span style={{ color: "#4ade80" }}>{fmt(x.after)}</span>
                  {x.after?.qualified && !x.before?.qualified ? " ✓ now qualified" : ""}
                  {!x.after?.qualified && x.before?.qualified ? " ✗ no longer qualified" : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ===========================================================================
// SERIES
// ===========================================================================
function SeriesLevel(props: {
  api: ApiFn; list: any[]; busy: boolean; setBusy: (b: boolean) => void; reload: () => void; onOpen: (s: any) => void;
}) {
  const { api, list, busy, setBusy, reload, onOpen } = props;
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(blank());

  function blank() {
    return {
      title: "", description: "", thumbnail_url: "", thumbnail_url_mobile: "",
      price: 0, original_price: 0, validity_days: 180, display_order: 0,
      visible_on: "both", telegram_group: "", bundle_ids: "",
    };
  }

  function startEdit(s: any) {
    setEditId(s.id);
    setForm({
      title: s.title || "", description: s.description || "",
      thumbnail_url: s.thumbnail_url || "", thumbnail_url_mobile: s.thumbnail_url_mobile || "",
      price: s.price ?? 0, original_price: s.original_price ?? 0,
      validity_days: s.validity_days ?? 180, display_order: s.display_order ?? 0,
      visible_on: s.visible_on || "both", telegram_group: s.telegram_group || "",
      bundle_ids: (s.bundle_items || []).map((b: any) => `${b.type}:${b.id}`).join(", "),
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) return alert("Series title is required.");
    setBusy(true);
    try {
      // "mock:2, course:5" -> [{type:"mock",id:2},{type:"course",id:5}]
      const bundle_items = String(form.bundle_ids || "")
        .split(",").map((x: string) => x.trim()).filter(Boolean)
        .map((x: string) => {
          const [t, i] = x.split(":");
          return { type: (t || "").trim(), id: parseInt((i || "").trim(), 10) };
        })
        .filter((b: any) => b.type && !isNaN(b.id));

      const body = {
        title: form.title, description: form.description,
        thumbnail_url: form.thumbnail_url || null,
        thumbnail_url_mobile: String(form.thumbnail_url_mobile || "").trim() || null,
        price: Number(form.price) || 0,
        original_price: Number(form.original_price) || 0,
        validity_days: Number(form.validity_days) || 180,
        display_order: Number(form.display_order) || 0,
        visible_on: form.visible_on || "both",
        telegram_group: String(form.telegram_group || "").trim() || null,
        bundle_items,
      };
      if (editId) await api(`/tier2/admin/series/${editId}`, "PUT", body);
      else await api("/tier2/admin/series", "POST", body);
      setForm(blank()); setEditId(null); setShowForm(false); reload();
    } catch (e: any) { alert(e?.message || "Could not save the series."); }
    finally { setBusy(false); }
  }

  async function hide(s: any) {
    if (!confirm(`"${s.title}" chhup jayegi — students ko dikhna band ho jayega. Data safe rahega aur kabhi bhi wapas on kar sakte hain. Theek hai?`)) return;
    setBusy(true);
    try { await api(`/tier2/admin/series/${s.id}`, "DELETE"); reload(); }
    catch (e: any) { alert(e?.message || "Could not do that."); }
    finally { setBusy(false); }
  }

  async function hardDelete(s: any) {
    if (!confirm(`PERMANENT DELETE: "${s.title}" will take ALL its passages and student attempts with it. This cannot be undone. Continue?`)) return;
    if (!confirm("Once more — this erases everything. Confirm?")) return;
    setBusy(true);
    try { await api(`/tier2/admin/series/${s.id}?hard=1`, "DELETE"); reload(); }
    catch (e: any) { alert(e?.message || "Could not delete."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={() => { setEditId(null); setForm(blank()); setShowForm(!showForm); }} style={{ ...goldBtn, marginBottom: 14 }}>
        {showForm ? "Close form" : "+ New series"}
      </button>

      {showForm ? (
        <div style={{ ...cardBox, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editId ? "Edit series" : "New series"}</h3>

          <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="P&H High Court Clerk — Tier 2 Practice" /></Field>

          <ImageField
            label="🖥️ Series thumbnail — desktop"
            value={form.thumbnail_url || ""}
            onChange={(v) => setForm({ ...form, thumbnail_url: v })}
            reqW={1280} reqH={720}
            where="Tier 2 list ka card, computer par"
          />
          <ImageField
            label="📱 Series thumbnail — mobile (optional)"
            value={form.thumbnail_url_mobile || ""}
            onChange={(v) => setForm({ ...form, thumbnail_url_mobile: v })}
            reqW={1080} reqH={1080}
            where="Wahi card phone par. Khaali chhodenge to desktop wali chalegi."
          />

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Price (₹)" hint="0 = free"><input type="number" style={inputStyle} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="MRP (₹)" hint="struck-through price"><input type="number" style={inputStyle} value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} /></Field>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Validity (days)"><input type="number" style={inputStyle} value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: e.target.value })} /></Field>
            <Field label="Display order"><input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></Field>
          </div>

          <Field label="Show on" hint="Set to Hidden once the exam is over — the data stays, it just stops showing.">
            <select style={inputStyle} value={form.visible_on} onChange={(e) => setForm({ ...form, visible_on: e.target.value })}>
              <option value="both">Both — App + Website</option>
              <option value="app">App only</option>
              <option value="web">Website only</option>
              <option value="hidden">🚫 Hidden — shows nowhere</option>
            </select>
          </Field>

          <Field label="Telegram group link (optional)">
            <input style={inputStyle} placeholder="https://t.me/..." value={form.telegram_group} onChange={(e) => setForm({ ...form, telegram_group: e.target.value })} />
          </Field>

          <Field label="Bundle — what else this unlocks (optional)" hint="Format: mock:2, course:5, descriptive:3, tier2:1">
            <input style={inputStyle} value={form.bundle_ids} onChange={(e) => setForm({ ...form, bundle_ids: e.target.value })} placeholder="mock:2, course:5" />
          </Field>

          <Field label="Description"><textarea rows={2} style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

          <button onClick={save} disabled={busy} style={{ ...goldBtn, width: "100%" }}>
            {busy ? "Saving…" : editId ? "Save changes" : "Create series"}
          </button>
        </div>
      ) : null}

      <KrutiDevCheck api={api} />

      {list.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 14 }}>No series yet. Create one, then add passages to it.</p>
      ) : (
        list.map((s) => (
          <div key={s.id} style={rowCard}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {s.title}{" "}
                {!s.is_active ? <span style={{ fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>HIDDEN</span> : null}
                {s.visible_on === "hidden" ? <span style={{ fontSize: 10, fontWeight: 900, color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)", background: "rgba(255,107,107,0.14)", borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>HIDDEN</span> : null}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                ID {s.id} · {Number(s.price) > 0 ? `₹${s.price}` : "Free"} ·
                {" "}{s.counts?.practice || 0} practice · {s.counts?.test || 0} tests
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              <button onClick={() => onOpen(s)} style={ghostBtn}>Passages →</button>
              <button onClick={() => startEdit(s)} style={ghostBtn}>Edit</button>
              <button onClick={() => hide(s)} style={dangerBtn}>Hide</button>
              <button onClick={() => hardDelete(s)} style={dangerBtn}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── KrutiDev ka test box ─────────────────────────────────────────────────────
// Ye mapping maanak hai par asli KrutiDev keyboard se typed text par jaanchi
// nahi gayi. Hindi tests live karne se PEHLE yahan ek paragraph paste karke
// dekh lijiye ki sahi Hindi ban rahi hai.
function KrutiDevCheck({ api }: { api: ApiFn }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await api("/tier2/admin/krutidev-check", "POST", { text });
      setOut(r?.unicode || "");
    } catch (e: any) { setOut("Error: " + (e?.message || "could not convert")); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ ...cardBox, marginBottom: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", color: GOLD, fontWeight: 800, fontSize: 13.5, cursor: "pointer", padding: 0 }}
      >
        {open ? "▾" : "▸"} KrutiDev converter check
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
            Type or paste text from a KrutiDev keyboard and check that it converts to correct
            Hindi. Do this before you publish any Hindi test — the whole checking depends on it.
          </p>
          <textarea
            rows={3} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13 }}
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="e.g. U;k;ky; us vkns'k ikfjr fd;k"
          />
          <button onClick={run} disabled={busy} style={{ ...ghostBtn, marginTop: 10 }}>
            {busy ? "Converting…" : "Convert"}
          </button>
          {out && (
            <div style={{ marginTop: 12, background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, fontSize: 16, lineHeight: 1.8 }}>
              {out}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// PASSAGES
// ===========================================================================

// ── Presets ──────────────────────────────────────────────────────────────
// Standard formula (SKAU, NBEMS): gross = keystrokes ÷ 5, har galti ek poora
// shabd, speed hamesha passage ke poore time se, accuracy ki alag shart nahi.
//
// SKAU Clerk Phase-1 — official notice (Sep 2026): qualifying 30 NWPM, marks
// (NWPM − 30) × 0.5, max 15. Notice me 5% maafi ya 10 shabd ki kaat NAHI hai,
// isliye SKAU ab NTPC par nahi, standard par hai.
const SKAU_PRESET = {
  scoring_mode: "standard",
  language: "english",
  duration_min: 10,
  target_wpm: 30,
  min_accuracy: 0,        // standard me accuracy ki alag shart nahi
  min_keystrokes: 0,
  passage_mode: "screen",
  ignorable_pct: 0,
  mistake_penalty_words: 0,
  marks_max: 15,
  marks_base_wpm: 30,
  marks_per_extra_wpm: 0.5,
};

// NBEMS Junior Assistant — NBEMS ne na formula chhaapa na speed. 35 WPM coaching
// ke infographic se liya hai (approx). Marks nahi, sirf qualify / not qualify.
const NBEMS_PRESET = {
  scoring_mode: "standard",
  language: "english",
  duration_min: 10,
  target_wpm: 35,
  min_accuracy: 0,
  min_keystrokes: 0,
  passage_mode: "screen",
  ignorable_pct: 0,
  mistake_penalty_words: 0,
  marks_max: 0,
  marks_base_wpm: 0,
  marks_per_extra_wpm: 0,
};

// RRB NTPC — 5% galtiyan maaf, baaki har galti par 10 shabd. Sirf asli NTPC
// jaisi series ke liye; SKAU ab isme nahi hai.
const NTPC_PRESET = {
  duration_min: 10,
  target_wpm: 30,
  min_accuracy: 0,
  min_keystrokes: 0,
  passage_mode: "screen",
  ignorable_pct: 5,
  mistake_penalty_words: 10,
  marks_max: 0,
  marks_base_wpm: 0,
  marks_per_extra_wpm: 0,
};

// Mode badalte waqt NTPC ke niyam saaf karna zaroori hai.
// Warna purana marks_max chipka reh jata hai aur doosre mode me bhi
// chup-chaap marks banta rehta — koi error nahi, bas galat number.
// min_accuracy bhi wapas laate hain: ntpc use 0 kar deta hai, aur wahi 0
// word mode me chala jaye to accuracy ki shart hi khatam ho jayegi.
function clearNtpc(f: any) {
  return {
    ignorable_pct: 0,
    mistake_penalty_words: 0,
    marks_max: 0,
    marks_base_wpm: 0,
    marks_per_extra_wpm: 0,
    min_accuracy: Number(f.min_accuracy) > 0 ? f.min_accuracy : 90,
  };
}

function PassagesLevel(props: {
  api: ApiFn; series: any; list: any[]; busy: boolean; setBusy: (b: boolean) => void; reload: () => void;
}) {
  const { api, series, list, busy, setBusy, reload } = props;
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(blank());

  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [bulkMsg, setBulkMsg] = useState("");

  function blank() {
    return {
      title: "", test_number: (list.length || 0) + 1, kind: "test", passage_text: "",
      duration_min: 10, target_wpm: 30, min_accuracy: 90,
      language: "english", scoring_mode: "word", min_keystrokes: 0, passage_mode: "paper",
      ignorable_pct: 0, mistake_penalty_words: 0,
      marks_max: 0, marks_base_wpm: 0, marks_per_extra_wpm: 0,
      check_line_breaks: false,
      level: "pro",
      is_free: false, display_order: 0,
    };
  }

  function startEdit(p: any) {
    setEditId(p.id);
    setForm({
      title: p.title || "", test_number: p.test_number, kind: p.kind || "test",
      passage_text: p.passage_text || "", duration_min: p.duration_min ?? 10,
      target_wpm: p.target_wpm ?? 30, min_accuracy: p.min_accuracy ?? 90,
      language: p.language || "english", scoring_mode: p.scoring_mode || "word",
      min_keystrokes: p.min_keystrokes ?? 0, passage_mode: p.passage_mode || "paper",
      ignorable_pct: p.ignorable_pct ?? 0,
      mistake_penalty_words: p.mistake_penalty_words ?? 0,
      marks_max: p.marks_max ?? 0,
      marks_base_wpm: p.marks_base_wpm ?? 0,
      marks_per_extra_wpm: p.marks_per_extra_wpm ?? 0,
      check_line_breaks: !!p.check_line_breaks,
      level: p.level || "pro",
      is_free: !!p.is_free, display_order: p.display_order ?? 0,
    });
    setShowForm(true);
  }

  function body() {
    return {
      series_id: series.id,
      title: form.title,
      test_number: Number(form.test_number) || 1,
      kind: form.kind,
      passage_text: form.passage_text,
      duration_min: Number(form.duration_min) || 10,
      target_wpm: Number(form.target_wpm) || 30,
      // NTPC me 0 asli value hai (accuracy ki shart hai hi nahi), isliye
      // yahan `|| 90` nahi laga sakte — wo 0 ko chupchaap 90 bana deta.
      min_accuracy: Number(form.min_accuracy) || 0,
      language: form.language,
      scoring_mode: form.scoring_mode,
      min_keystrokes: Number(form.min_keystrokes) || 0,
      passage_mode: form.passage_mode,
      ignorable_pct: Number(form.ignorable_pct) || 0,
      mistake_penalty_words: Number(form.mistake_penalty_words) || 0,
      marks_max: Number(form.marks_max) || 0,
      marks_base_wpm: Number(form.marks_base_wpm) || 0,
      marks_per_extra_wpm: Number(form.marks_per_extra_wpm) || 0,
      check_line_breaks: !!form.check_line_breaks,
      level: form.level || "pro",
      is_free: !!form.is_free,
      display_order: Number(form.display_order) || 0,
    };
  }

  async function save() {
    if (!form.title.trim()) return alert("Title is required.");
    if (!form.passage_text.trim()) return alert("Passage text is required.");
    setBusy(true);
    try {
      if (editId) await api(`/tier2/admin/passages/${editId}`, "PUT", body());
      else await api("/tier2/admin/passages", "POST", body());
      setForm(blank()); setEditId(null); setShowForm(false); reload();
    } catch (e: any) { alert(e?.message || "Could not save."); }
    finally { setBusy(false); }
  }

  async function remove(p: any) {
    if (!confirm(`"${p.title}" hata dein? (students ko dikhna band, data safe)`)) return;
    setBusy(true);
    try { await api(`/tier2/admin/passages/${p.id}`, "DELETE"); reload(); }
    catch (e: any) { alert(e?.message || "Could not do that."); }
    finally { setBusy(false); }
  }

  // ── Bulk ──
  function checkCsv(text?: string) {
    setBulkMsg("");
    const rows = parseCSV(text ?? csvText);
    if (rows.length === 0) { setBulkMsg("Nothing found."); setParsed(null); return; }

    // Header line ho to chhod do
    const first = (rows[0][0] || "").trim().toLowerCase();
    const body = first === "title" || first === "titles" ? rows.slice(1) : rows;

    const out: any[] = [];
    const seen = new Set<number>();
    const problems: string[] = [];

    body.forEach((r, i) => {
      const [title, num, kind, passage, dur, wpm, acc, lang, mode, keys, pmode, mmax, mbase, mper, lines, lvl] = r;
      const n = parseInt((num || "").trim(), 10);
      if (!title || !title.trim()) { problems.push(`Row ${i + 1}: title is empty`); return; }
      if (isNaN(n)) { problems.push(`Row ${i + 1}: test number is not valid`); return; }
      if (!passage || passage.trim().split(/\s+/).length < 20) {
        problems.push(`Row ${i + 1}: passage is too short (${(passage || "").trim().split(/\s+/).length} words)`);
      }
      if (seen.has(n)) problems.push(`Row ${i + 1}: test number ${n} appears twice`);
      seen.add(n);

      // Scoring column: word / keystroke / standard / ntpc — aur shortcut:
      // "skau" = standard + SKAU marks, "nbems" = standard, 35 WPM, marks nahi.
      const modeRaw = (mode || "word").trim().toLowerCase();
      const preset = modeRaw === "skau" ? SKAU_PRESET : modeRaw === "nbems" ? NBEMS_PRESET : null;
      const smode = preset ? "standard"
        : modeRaw === "keystroke" ? "keystroke"
        : modeRaw === "standard" ? "standard"
        : modeRaw === "ntpc" ? "ntpc" : "word";
      const ntpc = smode === "ntpc";
      // In dono me accuracy ki shart hai hi nahi — CSV me kuch bhi likha ho
      const noGate = ntpc || smode === "standard";
      const numOr = (v: string | undefined, d: number) => {
        const x = parseFloat((v || "").trim());
        return isNaN(x) ? d : x;
      };

      out.push({
        series_id: series.id,
        title: title.trim(),
        test_number: n,
        kind: (kind || "test").trim().toLowerCase() === "practice" ? "practice" : "test",
        passage_text: (passage || "").trim(),
        duration_min: parseInt((dur || "10").trim(), 10) || 10,
        target_wpm: parseInt((wpm || "").trim(), 10) || (preset ? preset.target_wpm : 30),
        // ntpc/standard me accuracy ki shart hai hi nahi — CSV me kuch bhi likha
        // ho, 0 hi jayega. Warna 90 chala jata aur students galat fail hote.
        min_accuracy: noGate ? 0 : (parseInt((acc || "90").trim(), 10) || 90),
        language: (lang || "english").trim().toLowerCase() === "hindi" ? "hindi" : "english",
        scoring_mode: smode,
        min_keystrokes: noGate ? 0 : (parseInt((keys || "0").trim(), 10) || 0),
        // Khaali chhoda ho to keystroke aur ntpc wale apne aap screen par
        passage_mode: (pmode || "").trim().toLowerCase() === "screen" ? "screen"
          : (pmode || "").trim().toLowerCase() === "paper" ? "paper"
          : (smode === "word" ? "paper" : "screen"),
        // NTPC ke 5% / 10 shabd apne aap. Marks: 12-14 columns se, warna preset
        // (skau = 15 / 30 / 0.5), warna 0 = marks nahi.
        ignorable_pct: ntpc ? 5 : 0,
        mistake_penalty_words: ntpc ? 10 : 0,
        marks_max: numOr(mmax, preset ? preset.marks_max : 0),
        marks_base_wpm: numOr(mbase, preset ? preset.marks_base_wpm : 0),
        marks_per_extra_wpm: numOr(mper, preset ? preset.marks_per_extra_wpm : 0),
        // 15va column: yes = letter format (Enter ki jaanch)
        check_line_breaks: /^(yes|y|true|1)$/i.test((lines || "").trim()),
        // 16va column: easy / medium / hard / pro (khaali = pro)
        level: ["easy", "medium", "hard", "pro"].includes((lvl || "").trim().toLowerCase())
          ? (lvl || "").trim().toLowerCase() : "pro",
        is_free: false,
        display_order: n,
      });
    });

    setParsed(out);
    setBulkMsg(problems.length ? `${out.length} rows found. Check these:\n• ${problems.join("\n• ")}` : `${out.length} rows look fine.`);
  }

  async function uploadBulk() {
    if (!parsed || parsed.length === 0) return alert("Press Check CSV first.");
    setBusy(true);
    try {
      const res = await api("/tier2/admin/passages/bulk", "POST", { series_id: series.id, passages: parsed });
      const failed = res?.failed || [];
      setBulkMsg(
        `${res.added} passages added.` +
        (failed.length ? `\nFailed (${failed.length}):\n• ` + failed.map((f: any) => `Row ${f.row} — ${f.error}`).join("\n• ") : "")
      );
      setParsed(null); setCsvText("");
      reload();
    } catch (e: any) { alert(e?.message || "Upload failed."); }
    finally { setBusy(false); }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { const t = String(rd.result || ""); setCsvText(t); checkCsv(t); };
    rd.readAsText(f);
  }

  const practice = list.filter((p) => p.kind === "practice");
  const tests = list.filter((p) => p.kind !== "practice");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => { setEditId(null); setForm(blank()); setShowForm(!showForm); setShowBulk(false); }} style={goldBtn}>
          {showForm ? "Close form" : "+ New passage"}
        </button>
        <button onClick={() => { setShowBulk(!showBulk); setShowForm(false); }} style={ghostBtn}>
          {showBulk ? "Close bulk" : "⬆️ Bulk upload"}
        </button>
      </div>

      {showBulk ? (
        <div style={{ ...cardBox, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Bulk upload (CSV / TSV)</h3>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
            10 columns: <b style={{ color: "#e0dacb" }}>Title, Test number, Type (practice/test),
            Passage, Minutes, Target WPM, Min accuracy, Language, Scoring, Min keystrokes</b>.
            Aage optional: <b style={{ color: "#e0dacb" }}>11 Passage mode</b> (paper / screen),
            {" "}<b style={{ color: "#e0dacb" }}>12 Marks, 13 Zero-marks WPM, 14 Marks per extra WPM</b>,
            {" "}<b style={{ color: "#e0dacb" }}>15 Letter format</b> (yes / no),
            {" "}<b style={{ color: "#e0dacb" }}>16 Level</b> (easy / medium / hard / pro — khaali = pro).
            Blank ho to 10, 30, 90, english, word aur 0 lag jayega; word ke alawa sab apne aap screen par.
            Language: english / hindi. Scoring: word / keystroke / standard / ntpc — ya shortcut
            {" "}<b>skau</b> (standard + 30 WPM + 15 marks) aur <b>nbems</b> (standard + 35 WPM, marks nahi).
            Standard aur ntpc me accuracy aur min keystrokes apne aap 0.
            Passage me comma ya nayi line (letter format) hai to use double quotes me daal dijiye — ya Excel/Sheets se seedha paste kar dijiye (TAB apne aap pakda jata hai).
          </p>
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={handleFile} style={{ marginBottom: 12, fontSize: 13 }} />
          <textarea
            rows={7}
            placeholder={'Or paste here...\nTyping Test 1,1,test,"The Constitution of India is the supreme law...",10,30,90'}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12.5 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => checkCsv()} style={ghostBtn}>Check CSV</button>
            <button onClick={uploadBulk} disabled={busy || !parsed} style={goldBtn}>
              {busy ? "Uploading…" : `Upload ${parsed ? parsed.length : ""}`}
            </button>
          </div>
          {bulkMsg && (
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>{bulkMsg}</pre>
          )}
        </div>
      ) : null}

      {showForm ? (
        <div style={{ ...cardBox, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editId ? "Edit passage" : "New passage"}</h3>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Typing Test 1" /></Field>
            <Field label="Test number" hint="printed on the PDF">
              <input type="number" style={inputStyle} value={form.test_number} onChange={(e) => setForm({ ...form, test_number: e.target.value })} />
            </Field>
          </div>

          <Field label="Type" hint="Practice = PDF download plus the show-on-screen option. Test = typing only.">
            <select style={inputStyle} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="practice">Practice passage</option>
              <option value="test">Typing test</option>
            </select>
          </Field>

          <Field label="Passage text" hint="The full paragraph with punctuation. The PDF and the checking both come from this, so commas and full stops must be exact.">
            <textarea rows={9} style={{ ...inputStyle, lineHeight: 1.7 }} value={form.passage_text} onChange={(e) => setForm({ ...form, passage_text: e.target.value })} />
          </Field>
          <div style={{ fontSize: 11.5, color: MUTED, margin: "-4px 0 10px" }}>
            {form.passage_text.trim() ? form.passage_text.trim().split(/\s+/).length : 0} words ·
            {" "}for {Number(form.target_wpm) || 30} WPM in {Number(form.duration_min) || 10} min you need
            {" "}~{Math.round((Number(form.target_wpm) || 30) * (Number(form.duration_min) || 10))} words
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Duration (min)"><input type="number" style={inputStyle} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></Field>
            <Field label="Target net WPM"><input type="number" style={inputStyle} value={form.target_wpm} onChange={(e) => setForm({ ...form, target_wpm: e.target.value })} /></Field>
          </div>

          {/* NTPC me accuracy ki alag shart hoti hi nahi — galti ka hisaab
              pehle hi net speed me lag chuka hota hai. Field dikhate rehte to
              admin use 90 kar deta aur achhi speed wale students galat fail
              hote. Isliye us mode me chhupa dete hain. */}
          {form.scoring_mode !== "ntpc" && form.scoring_mode !== "standard" ? (
            <Field label="Minimum accuracy (%)" hint="90% is strict — 80% works better for practice passages.">
              <input type="number" style={inputStyle} value={form.min_accuracy} onChange={(e) => setForm({ ...form, min_accuracy: e.target.value })} />
            </Field>
          ) : (
            <div style={{ fontSize: 11.5, color: MUTED, margin: "0 0 12px", lineHeight: 1.6 }}>
              Accuracy ki alag shart nahi lagti — har galti ka hisaab net speed me hi lag jaata hai.
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Language" hint="Hindi passages need the Devanagari font in fonts/ for PDFs.">
              <select style={inputStyle} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
              </select>
            </Field>
            <Field label="Scoring">
              <select
                style={inputStyle}
                value={form.scoring_mode}
                onChange={(e) => {
                  const m = e.target.value;
                  // Har mode ke maanak apne aap bhar dete hain — har baar yaad
                  // rakhna nahi padega. Badalna ho to badal lijiye.
                  const hindi = form.language === "hindi";
                  setForm({
                    ...form,
                    scoring_mode: m,
                    ...(m === "keystroke"
                      ? { target_wpm: hindi ? 30 : 35, min_keystrokes: hindi ? 1750 : 2000,
                          passage_mode: "screen", ...clearNtpc(form) }
                      : m === "standard"
                      // Marks/target jaise the waise — neeche SKAU / NBEMS button se bhariye
                      ? { min_accuracy: 0, min_keystrokes: 0, passage_mode: "screen",
                          ignorable_pct: 0, mistake_penalty_words: 0 }
                      : m === "ntpc"
                      ? NTPC_PRESET
                      : { min_keystrokes: 0, passage_mode: "paper", ...clearNtpc(form) }),
                  });
                }}
              >
                <option value="word">Correct words (P&amp;H)</option>
                <option value="keystroke">Keystrokes (NCERT)</option>
                <option value="standard">Standard (SKAU, NBEMS)</option>
                <option value="ntpc">RRB NTPC</option>
              </select>
            </Field>
          </div>

          <Field label="Passage" hint="Paper = student prints the PDF and picks its test number, like P&H. Screen = the passage stays on screen and typing starts straight away, like NCERT.">
            <select style={inputStyle} value={form.passage_mode} onChange={(e) => setForm({ ...form, passage_mode: e.target.value })}>
              <option value="paper">On paper — print the PDF</option>
              <option value="screen">On screen — no printing</option>
            </select>
          </Field>

          {/* Level — sirf mushkil. Lambai sabki ~400 words rakhiye (10 minute
              me WPM sahi aaye). Practice list Easy se Pro ke order me lagti hai. */}
          <Field label="Level" hint="Easy: short common words · Medium: simple court language · Hard: exam-style · Pro: full exam level">
            <select style={inputStyle} value={form.level || "pro"} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="pro">Pro</option>
            </select>
          </Field>

          {/* Letter format (NBEMS) — Enter sahi jagah dabana bhi jaancha jaye.
              Band ho to line breaks space ki tarah maane jaate hain, jaise pehle. */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, margin: "0 0 12px", cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.check_line_breaks} onChange={(e) => setForm({ ...form, check_line_breaks: e.target.checked })} style={{ marginTop: 3 }} />
            <span>
              Letter format — check line breaks
              <span style={{ display: "block", fontSize: 11.5, color: MUTED, marginTop: 2, lineHeight: 1.5 }}>
                Student ko wahin Enter dabana hoga jahan passage me nayi line shuru hoti hai. Galat
                jagah Enter ya chhoota Enter = 1 galti. Khaali lines aur line ki shuruat ke space
                nahi jaanche jaate. Passage text me lines waise hi likhiye jaise letter me hoti hain.
              </span>
            </span>
          </label>

          {form.scoring_mode === "keystroke" && (
            <Field label="Minimum keystrokes" hint="NCERT: 2000 in English, 1750 in Hindi. Below this the candidate fails whatever the speed.">
              <input type="number" style={inputStyle} value={form.min_keystrokes}
                     onChange={(e) => setForm({ ...form, min_keystrokes: e.target.value })} />
            </Field>
          )}

          {form.scoring_mode === "standard" && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, margin: "0 0 12px" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>Standard formula (SKAU, NBEMS)</div>
              <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 10 }}>
                Gross words = keystrokes ÷ 5. Har galti ek shabd kaat-ti hai — full/half ka farak
                nahi. Speed hamesha passage ke poore {Number(form.duration_min) || 10} minute se banti
                hai, chahe student jaldi submit kare. Accuracy ki alag shart nahi.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button type="button" onClick={() => setForm({ ...form, ...SKAU_PRESET })} style={ghostBtn}>
                  Use SKAU values (30 WPM, 15 marks)
                </button>
                <button type="button" onClick={() => setForm({ ...form, ...NBEMS_PRESET })} style={ghostBtn}>
                  Use NBEMS values (35 WPM, no marks)
                </button>
              </div>
              <MarksFields form={form} setForm={setForm} />
            </div>
          )}

          {form.scoring_mode === "ntpc" && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, margin: "0 0 12px" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>RRB NTPC ke niyam</div>
              <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.6, marginBottom: 10 }}>
                Gross words = keystrokes ÷ 5. Usme se {Number(form.ignorable_pct) || 0}% galtiyan maaf.
                Jo bachein, har ek par {Number(form.mistake_penalty_words) || 0} shabd kat-te hain.
                <br />
                <b>SKAU ke liye ye mode mat chuniye</b> — SKAU ke notice me ye niyam nahi hain, wo
                Standard par hai.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <Field label="Maaf galtiyan (%)" hint="NTPC: 5"><input type="number" style={inputStyle} value={form.ignorable_pct} onChange={(e) => setForm({ ...form, ignorable_pct: e.target.value })} /></Field>
                <Field label="Har galti par shabd" hint="NTPC: 10"><input type="number" style={inputStyle} value={form.mistake_penalty_words} onChange={(e) => setForm({ ...form, mistake_penalty_words: e.target.value })} /></Field>
              </div>

              <MarksFields form={form} setForm={setForm} />
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Display order"><input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></Field>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, margin: "4px 0 12px", cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
            Free — open without buying (keep one as a demo)
          </label>

          <button onClick={save} disabled={busy} style={{ ...goldBtn, width: "100%" }}>
            {busy ? "Saving…" : editId ? "Save changes" : "Create passage"}
          </button>
        </div>
      ) : null}

      <Group title="Practice passages" list={practice} onEdit={startEdit} onRemove={remove} />
      <Group title="Typing tests" list={tests} onEdit={startEdit} onRemove={remove} />
    </div>
  );
}

// Marks ke teen khaane + jhaanki. Standard aur NTPC dono me.
function MarksFields({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Kul marks" hint="SKAU: 15. 0 = marks nahi."><input type="number" style={inputStyle} value={form.marks_max} onChange={(e) => setForm({ ...form, marks_max: e.target.value })} /></Field>
        <Field label="0 marks wali WPM" hint="SKAU: 30"><input type="number" style={inputStyle} value={form.marks_base_wpm} onChange={(e) => setForm({ ...form, marks_base_wpm: e.target.value })} /></Field>
        <Field label="Per extra WPM" hint="SKAU: 0.5"><input type="number" step="0.1" style={inputStyle} value={form.marks_per_extra_wpm} onChange={(e) => setForm({ ...form, marks_per_extra_wpm: e.target.value })} /></Field>
      </div>

      {/* Jhaanki — save karne se pehle hi dikh jaye ki number theek hain.
          Galat setting yahin pakdi jayegi, 200 students ke baad nahi. */}
      {Number(form.marks_max) > 0 && (
        <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.9 }}>
          {[30, 40, 50, 60, 70].map((w) => {
            const base = Number(form.marks_base_wpm) || 0;
            const per = Number(form.marks_per_extra_wpm) || 0;
            const max = Number(form.marks_max) || 0;
            const mk = Math.min(Math.max(0, (w - base) * per), max);
            return (
              <span key={w} style={{ marginRight: 14 }}>
                {w} WPM → <b style={{ color: mk >= max ? "#5dd97c" : "inherit" }}>{mk}</b>
              </span>
            );
          })}
          <br />
          Poore marks {Math.ceil((Number(form.marks_base_wpm) || 0) + (Number(form.marks_max) || 0) / (Number(form.marks_per_extra_wpm) || 1))} WPM par — usse upar kuch extra nahi milta.
        </div>
      )}
    </>
  );
}

function Group({ title, list, onEdit, onRemove }: { title: string; list: any[]; onEdit: (p: any) => void; onRemove: (p: any) => void }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 8px" }}>{title} ({list.length})</h3>
      {list.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13 }}>None yet.</p>
      ) : list.map((p) => (
        <div key={p.id} style={rowCard}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>
              #{p.test_number} · {p.title}
              {!p.is_active ? <span style={{ fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>HIDDEN</span> : null}
              {p.is_free ? <span style={{ fontSize: 10, color: "#4ade80", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>FREE</span> : null}
            </div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
              {(p.passage_text || "").trim().split(/\s+/).length} words · {p.duration_min}min · {p.target_wpm} WPM
              {/* ntpc me accuracy ki shart hai hi nahi — uski jagah marks
                  dikhana zyada kaam ka hai. */}
              {p.scoring_mode === "ntpc" || p.scoring_mode === "standard"
                ? (Number(p.marks_max) > 0 ? ` · ${p.marks_max} marks` : "")
                : ` · ${p.min_accuracy ?? 90}% accuracy`}
              {p.scoring_mode === "standard" ? " · standard" : p.scoring_mode === "ntpc" ? " · NTPC" : ""}
              {p.check_line_breaks ? " · letter format" : ""}
              {` · ${(p.level || "pro")}`}
              {p.language === "hindi" ? " · Hindi" : ""}
              {p.scoring_mode === "keystroke" ? ` · min ${p.min_keystrokes} keys` : ""}
              {(p.passage_mode || "paper") === "screen" ? " · on screen" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => onEdit(p)} style={ghostBtn}>Edit</button>
            <button onClick={() => onRemove(p)} style={dangerBtn}>Hide</button>
          </div>
        </div>
      ))}
    </div>
  );
}
