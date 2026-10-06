"use client";

// Mock Tests tab ka "⬆ Upload fixes" panel.
// Export ZIP ki theek ki hui TSV + nayi chart images yahin se chadhti hain.
// Server (POST /admin-extra/mock-tests/fix-upload) sirf usi series/mock ke
// question_id badalta hai — bina ID ki row ya doosri series ki row chhod deta
// hai. Naya question yahan se kabhi nahi banta.

import { useState, type CSSProperties } from "react";
import { API_URL } from "@/lib/config";

export type FixTarget = { kind: "series" | "mock"; id: number; title: string };

const TOKEN_KEY = "sl_admin_token";
const GOLD = "#FFAB00";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";

const FIELDS = [
  "question_id", "question_en", "option_a_en", "option_b_en", "option_c_en", "option_d_en",
  "correct_answer", "explanation_en", "topic", "section",
  "question_hi", "option_a_hi", "option_b_hi", "option_c_hi", "option_d_hi", "explanation_hi",
  "difficulty", "group_id", "group_order", "passage_en", "passage_hi", "exam_tags",
  "image_url", "explanation_image_url", "volatile", "volatile_note",
];

const btn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10,
  padding: "9px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};

function token() {
  return typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) || "";
}

// TSV/CSV — quote ke andar line break chalta hai (export ZIP me explanation kai line ki hoti hai)
function parseTable(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const first = text.split(/\r?\n/).find((l) => l.trim() !== "") || "";
  const SEP = (first.match(/\t/g) || []).length >= (first.match(/,/g) || []).length ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"' && field === "") q = true;
    else if (ch === SEP) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
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

const isUrl = (s: string) => /^https?:\/\//i.test(s);
const noExt = (s: string) => s.replace(/\.[a-z0-9]+$/i, "");

export default function FixUploadModal({ target, onClose }: { target: FixTarget; onClose: () => void }) {
  const [tsv, setTsv] = useState<File | null>(null);
  const [imgs, setImgs] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ updated: number; skipped: any[] } | null>(null);

  async function uploadImages(files: File[]): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    // Pehle chadh chuki image dobara ImgBB tak na jaye
    try {
      const r = await fetch(`${API_URL}/uploads/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ names: files.map((f) => f.name) }),
      });
      if (r.ok) {
        const { found } = await r.json();
        files.forEach((f) => {
          const u = found?.[noExt(f.name.trim().toLowerCase())];
          if (u) map[f.name.toLowerCase()] = String(u);
        });
      }
    } catch { /* lookup na chale to sab upload ho jayenge */ }

    const todo = files.filter((f) => !map[f.name.toLowerCase()]);
    for (let i = 0; i < todo.length; i += 20) {
      const part = todo.slice(i, i + 20);
      setStatus(`Charts upload ho rahe hain… ${i}/${todo.length}`);
      const fd = new FormData();
      part.forEach((f) => fd.append("files", f.type ? f : new File([f], f.name, { type: "image/png" })));
      fd.append("match_db", "false");
      const res = await fetch(`${API_URL}/uploads/bulk-images`, {
        method: "POST", headers: { Authorization: `Bearer ${token()}` }, body: fd,
      });
      const d = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(`Charts upload nahi hue: ${d.detail || res.status}`);
      const results: any[] = Array.isArray(d.results) ? d.results : [];
      const urlMap: Record<string, string> = d.url_map || {};
      const failed: string[] = [];
      part.forEach((f, k) => {
        const r = results.length === part.length ? results[k] : null;
        const u = (r && r.ok && r.url) || urlMap[f.name];
        if (u) map[f.name.toLowerCase()] = String(u); else failed.push(f.name);
      });
      if (failed.length) throw new Error(`${failed.length} charts nahi chadhe (${failed.slice(0, 5).join(", ")}) — kuch save nahi hua, dobara try kariye`);
    }
    return map;
  }

  async function run() {
    if (!tsv) return setErr("Pehle fixed questions wali TSV chuniye");
    setBusy(true); setErr(""); setResult(null);
    try {
      const rows = parseTable(await tsv.text());
      if (rows.length < 2) throw new Error("File me koi row nahi mili");
      const head = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const col: Record<string, number> = {};
      FIELDS.forEach((f) => { const i = head.indexOf(f); if (i !== -1) col[f] = i; });
      if (col.question_id === undefined) throw new Error("File me question_id column nahi hai — Mock Tests ke ⬇ ZIP wali TSV hi chalegi");

      const qs = rows.slice(1).map((r, i) => {
        const o: any = { row_no: i + 2 };
        FIELDS.forEach((f) => {
          if (col[f] === undefined) return;
          const v = (r[col[f]] || "").trim();
          o[f] = v === "" ? null : v;
        });
        o.question_id = Number(o.question_id) || null;
        o.group_order = o.group_order ? Number(o.group_order) : null;
        if (o.correct_answer) o.correct_answer = String(o.correct_answer).toUpperCase();
        return o;
      });

      // TSV me jo image naam likhe hain, wo chuni hui files me hone chahiye
      const byName = new Map(imgs.map((f) => [f.name.toLowerCase(), f]));
      const byBase = new Map(imgs.map((f) => [noExt(f.name.toLowerCase()), f]));
      const need = new Map<string, File>();
      const missing: string[] = [];
      qs.forEach((q) => ["image_url", "explanation_image_url"].forEach((k) => {
        const v = String(q[k] || "").trim();
        if (!v || v === "-" || isUrl(v)) return;
        const f = byName.get(v.toLowerCase()) || byBase.get(noExt(v.toLowerCase()));
        if (f) need.set(f.name.toLowerCase(), f); else missing.push(v);
      }));
      if (missing.length) {
        throw new Error(`Ye charts TSV me likhe hain par chune nahi gaye: ${[...new Set(missing)].slice(0, 8).join(", ")}`);
      }

      if (need.size) {
        const urls = await uploadImages([...need.values()]);
        qs.forEach((q) => ["image_url", "explanation_image_url"].forEach((k) => {
          const v = String(q[k] || "").trim();
          if (!v || v === "-" || isUrl(v)) return;
          const f = byName.get(v.toLowerCase()) || byBase.get(noExt(v.toLowerCase()));
          if (f) q[k] = urls[f.name.toLowerCase()];
        }));
      }

      let updated = 0;
      const skipped: any[] = [];
      for (let i = 0; i < qs.length; i += 200) {
        setStatus(`Questions update ho rahe hain… ${i}/${qs.length}`);
        const body: any = { questions: qs.slice(i, i + 200) };
        if (target.kind === "series") body.series_id = target.id; else body.mock_test_id = target.id;
        const res = await fetch(`${API_URL}/admin-extra/mock-tests/fix-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify(body),
        });
        const d = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          const det = typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail || "");
          throw new Error(`${updated ? `${updated} sudhar chuke the, phir ` : ""}server ne mana kiya: ${det || res.status}`);
        }
        updated += d.updated || 0;
        if (Array.isArray(d.skipped)) skipped.push(...d.skipped);
      }
      setResult({ updated, skipped });
      setStatus("");
    } catch (e: any) {
      setErr(String(e?.message || e));
      setStatus("");
    }
    setBusy(false);
  }

  return (
    <div onClick={busy ? undefined : onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#12100d", border: `1px solid ${BORDER}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>⬆ Upload fixes</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          {target.kind === "series" ? "Series" : "Mock"}: <b style={{ color: "#fff" }}>{target.title}</b><br />
          ⬇ ZIP wali theek ki hui TSV. Sirf isi {target.kind === "series" ? "series" : "mock"} ke questions
          (question_id se) badlenge — naya question nahi banega. Khaali cell purani value rehne deta hai,
          <code> - </code> likhne par wo field hat jaata hai.
        </div>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>1. Fixed questions (TSV)</div>
          <input type="file" accept=".tsv,.csv,.txt" disabled={busy}
            onChange={(e) => { setTsv(e.target.files?.[0] || null); setResult(null); setErr(""); }} />
        </label>
        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>
            2. Fixed charts (optional) — wahi images jinke naam TSV ke <code>image_url</code> me likhe hain
          </div>
          <input type="file" accept="image/*" multiple disabled={busy}
            onChange={(e) => { setImgs(Array.from(e.target.files || [])); setResult(null); setErr(""); }} />
          {imgs.length > 0 && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{imgs.length} images chuni</div>}
        </label>

        {err && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>{err}</div>}
        {status && <div style={{ color: GOLD, fontSize: 13, marginBottom: 10 }}>{status}</div>}
        {result && (
          <div style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
            <div style={{ color: "#5dd97c", fontWeight: 800 }}>✓ {result.updated} questions sudhare gaye</div>
            {result.skipped.length > 0 && (
              <div style={{ color: "#ffb86b", marginTop: 6 }}>
                {result.skipped.length} rows chhodi:
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {result.skipped.slice(0, 20).map((s, i) => (
                    <li key={i}>Row {s.row}: {s.why}</li>
                  ))}
                  {result.skipped.length > 20 && <li>… aur {result.skipped.length - 20}</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={run} disabled={busy || !tsv}
            style={{ ...btn, background: GOLD, color: "#1a1a1a", border: "none", flex: 1, opacity: busy || !tsv ? 0.6 : 1 }}>
            {busy ? "Upload ho raha hai…" : "Upload"}
          </button>
          <button onClick={onClose} disabled={busy} style={btn}>Band karo</button>
        </div>
      </div>
    </div>
  );
}
