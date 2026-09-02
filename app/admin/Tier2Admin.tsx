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
      language: "english", scoring_mode: "word", min_keystrokes: 0,
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
      min_keystrokes: p.min_keystrokes ?? 0,
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
      min_accuracy: Number(form.min_accuracy) || 90,
      language: form.language,
      scoring_mode: form.scoring_mode,
      min_keystrokes: Number(form.min_keystrokes) || 0,
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
      const [title, num, kind, passage, dur, wpm, acc, lang, mode, keys] = r;
      const n = parseInt((num || "").trim(), 10);
      if (!title || !title.trim()) { problems.push(`Row ${i + 1}: title is empty`); return; }
      if (isNaN(n)) { problems.push(`Row ${i + 1}: test number is not valid`); return; }
      if (!passage || passage.trim().split(/\s+/).length < 20) {
        problems.push(`Row ${i + 1}: passage is too short (${(passage || "").trim().split(/\s+/).length} words)`);
      }
      if (seen.has(n)) problems.push(`Row ${i + 1}: test number ${n} appears twice`);
      seen.add(n);

      out.push({
        series_id: series.id,
        title: title.trim(),
        test_number: n,
        kind: (kind || "test").trim().toLowerCase() === "practice" ? "practice" : "test",
        passage_text: (passage || "").trim(),
        duration_min: parseInt((dur || "10").trim(), 10) || 10,
        target_wpm: parseInt((wpm || "30").trim(), 10) || 30,
        min_accuracy: parseInt((acc || "90").trim(), 10) || 90,
        language: (lang || "english").trim().toLowerCase() === "hindi" ? "hindi" : "english",
        scoring_mode: (mode || "word").trim().toLowerCase() === "keystroke" ? "keystroke" : "word",
        min_keystrokes: parseInt((keys || "0").trim(), 10) || 0,
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
            Blank ho to 10, 30, 90, english, word aur 0 lag jayega.
            Language: english / hindi. Scoring: word / keystroke.
            Passage me comma hai to use double quotes me daal dijiye — ya Excel/Sheets se seedha paste kar dijiye (TAB apne aap pakda jata hai).
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

          <Field label="Minimum accuracy (%)" hint="90% is strict — 80% works better for practice passages.">
            <input type="number" style={inputStyle} value={form.min_accuracy} onChange={(e) => setForm({ ...form, min_accuracy: e.target.value })} />
          </Field>

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
                  // NCERT ke maanak apne aap bhar dete hain — har baar yaad
                  // rakhna nahi padega. Badalna ho to badal lijiye.
                  const hindi = form.language === "hindi";
                  setForm({
                    ...form,
                    scoring_mode: m,
                    ...(m === "keystroke"
                      ? { target_wpm: hindi ? 30 : 35, min_keystrokes: hindi ? 1750 : 2000 }
                      : { min_keystrokes: 0 }),
                  });
                }}
              >
                <option value="word">Correct words (P&amp;H)</option>
                <option value="keystroke">Keystrokes (NCERT)</option>
              </select>
            </Field>
          </div>

          {form.scoring_mode === "keystroke" && (
            <Field label="Minimum keystrokes" hint="NCERT: 2000 in English, 1750 in Hindi. Below this the candidate fails whatever the speed.">
              <input type="number" style={inputStyle} value={form.min_keystrokes}
                     onChange={(e) => setForm({ ...form, min_keystrokes: e.target.value })} />
            </Field>
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
              {(p.passage_text || "").trim().split(/\s+/).length} words · {p.duration_min}min · {p.target_wpm} WPM · {p.min_accuracy ?? 90}% accuracy
              {p.language === "hindi" ? " · Hindi" : ""}
              {p.scoring_mode === "keystroke" ? ` · min ${p.min_keystrokes} keys` : ""}
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
