"use client";

/**
 * app/components/MailMergeSim.tsx — MS Word ke "Mailings" tab jaisa Mail Merge.
 *
 * Asli Word ke kadam hi: Start Mail Merge → Letters, Select Recipients →
 * Type a New List (New Address List, Customize Columns), list Save, Insert
 * Merge Field, Preview Results, Finish & Merge → Edit Individual Documents,
 * aur merged letters ka Save As. Model = lib/nbemsMailMerge MergeDoc, jaanch
 * wahin ke checks se (grade()).
 *
 * Letter textarea me hai: «Field» bas text hai, isliye resume/save seedha.
 */
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { WORD_DEFAULT_COLUMNS, fieldsIn, type MergeDoc, type MergeMode } from "@/lib/nbemsMailMerge";

const BLUE = "#2b579a";
const LINE = "#c8c6c4";

type Draft = { columns: string[]; rows: string[][]; fresh: boolean };

export default function MailMergeSim({ start, onChange }: { start: MergeDoc; onChange: (d: MergeDoc) => void }) {
  const [doc, setDoc] = useState<MergeDoc>(start);
  const docRef = useRef(doc);
  const [menu, setMenu] = useState<"" | "start" | "recip" | "field" | "finish">("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selRow, setSelRow] = useState(0);
  const [custom, setCustom] = useState(false);
  const [saveList, setSaveList] = useState<string | null>(null);   // naam likhne ka dialog
  const [finish, setFinish] = useState(false);
  const [range, setRange] = useState<{ kind: "all" | "current" | "from"; from: number; to: number }>({ kind: "all", from: 1, to: 1 });
  const [showMerged, setShowMerged] = useState(false);
  const [mergedName, setMergedName] = useState("");
  const [rec, setRec] = useState(0);                               // preview ka record
  const [note, setNote] = useState("");
  const ta = useRef<HTMLTextAreaElement | null>(null);
  const sel = useRef({ s: start.body.length, e: start.body.length });

  function update(patch: Partial<MergeDoc>) {
    const next = { ...docRef.current, ...patch };
    docRef.current = next;
    setDoc(next);
    onChange(next);
  }
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote((x) => (x === m ? "" : x)), 3500); };
  const hasList = doc.columns.length > 0 && !!doc.listFile;

  // ── Start Mail Merge ──
  function pickMode(m: MergeMode) { setMenu(""); update({ mode: m }); flash(m ? `Main document type: ${LABEL[m]}` : "Normal Word document"); }

  // ── Recipient list ──
  function newList() {
    setMenu("");
    if (!doc.mode) { flash("First choose Start Mail Merge → Letters."); return; }
    setDraft({ columns: [...WORD_DEFAULT_COLUMNS], rows: [Array(WORD_DEFAULT_COLUMNS.length).fill("")], fresh: true });
    setSelRow(0);
  }
  function editList() {
    setMenu("");
    if (!hasList) { flash("There is no recipient list yet. Use Select Recipients → Type a New List."); return; }
    setDraft({ columns: [...doc.columns], rows: doc.rows.map((r) => [...r]), fresh: false });
    setSelRow(0);
  }
  function setCell(r: number, c: number, v: string) {
    if (!draft) return;
    const rows = draft.rows.map((x) => [...x]);
    rows[r][c] = v;
    setDraft({ ...draft, rows });
  }
  function listOk() {
    if (!draft) return;
    if (draft.fresh || !doc.listFile) { setSaveList(""); return; }
    commitList(doc.listFile);
  }
  function commitList(file: string) {
    if (!draft) return;
    const rows = draft.rows.filter((r) => r.some((v) => (v || "").trim()));
    update({ columns: draft.columns, rows, listFile: file, preview: false });
    setDraft(null); setSaveList(null); setCustom(false);
    flash(`${rows.length} recipient${rows.length === 1 ? "" : "s"} · list saved as ${file}`);
  }

  // ── Merge field ──
  function insertField(col: string) {
    setMenu("");
    if (doc.preview) { flash("Turn off Preview Results to insert fields."); return; }
    const tok = `«${col}»`;
    const b = docRef.current.body;
    const { s, e } = sel.current;
    const body = b.slice(0, s) + tok + b.slice(e);
    update({ body });
    const pos = s + tok.length;
    sel.current = { s: pos, e: pos };
    requestAnimationFrame(() => { const t = ta.current; if (t) { t.focus(); t.setSelectionRange(pos, pos); } });
  }
  const track = () => { const t = ta.current; if (t) sel.current = { s: t.selectionStart, e: t.selectionEnd }; };

  // ── Finish ──
  function doFinish() {
    const n = doc.rows.length;
    let count = n;
    if (range.kind === "current") count = n ? 1 : 0;
    if (range.kind === "from") count = Math.max(0, Math.min(n, range.to) - Math.max(1, range.from) + 1);
    update({ merged: { count, fields: fieldsIn(doc.body).length, at: Date.now() }, mergedFile: "" });
    setFinish(false); setShowMerged(true); setMergedName("");
  }
  const mergedRows = () => {
    const m = doc.merged; if (!m) return [] as string[][];
    if (range.kind === "current") return doc.rows.slice(rec, rec + 1);
    if (range.kind === "from") return doc.rows.slice(Math.max(0, range.from - 1), Math.max(0, range.to));
    return doc.rows.slice(0, m.count);
  };

  const fill = (row: string[] | undefined) =>
    doc.body.replace(/«([^»]+)»/g, (all, f: string) => {
      const i = doc.columns.findIndex((c) => c.toLowerCase() === f.toLowerCase());
      return i >= 0 && row ? row[i] || "" : all;
    });

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, overflow: "hidden", background: "#f3f2f1", color: "#201f1e", position: "relative" }}>
      {/* ── Ribbon ── */}
      <div style={{ background: BLUE, color: "#fff", padding: "6px 10px", fontSize: 12.5, display: "flex", gap: 14 }}>
        <span style={{ opacity: 0.75 }}>File</span><span style={{ opacity: 0.75 }}>Home</span><span style={{ opacity: 0.75 }}>Insert</span>
        <b style={{ borderBottom: "2px solid #fff" }}>Mailings</b>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, background: "#fff", borderBottom: `1px solid ${LINE}` }}>
        <Drop label="Start Mail Merge" open={menu === "start"} onToggle={() => setMenu(menu === "start" ? "" : "start")}>
          {(["letters", "email", "envelopes", "labels"] as MergeMode[]).map((m) => <Item key={m} on={doc.mode === m} onClick={() => pickMode(m)}>{LABEL[m]}</Item>)}
          <Item onClick={() => pickMode("")}>Normal Word Document</Item>
        </Drop>
        <Drop label="Select Recipients" open={menu === "recip"} onToggle={() => setMenu(menu === "recip" ? "" : "recip")}>
          <Item onClick={newList}>Type a New List…</Item>
          <Item disabled onClick={() => {}}>Use an Existing List…</Item>
          <Item disabled onClick={() => {}}>Choose from Outlook Contacts…</Item>
        </Drop>
        <Btn onClick={editList} disabled={!hasList}>Edit Recipient List</Btn>
        <Drop label="Insert Merge Field" open={menu === "field"} disabled={!hasList} onToggle={() => setMenu(menu === "field" ? "" : "field")}>
          {doc.columns.map((c) => <Item key={c} onClick={() => insertField(c)}>{c}</Item>)}
        </Drop>
        <Btn on={doc.preview} disabled={!hasList} onClick={() => { update({ preview: !doc.preview }); setRec(0); }}>Preview Results</Btn>
        {doc.preview && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5 }}>
            <Btn onClick={() => setRec(Math.max(0, rec - 1))} aria="Previous record">◀</Btn>
            <span style={{ minWidth: 38, textAlign: "center" }}>{doc.rows.length ? rec + 1 : 0} / {doc.rows.length}</span>
            <Btn onClick={() => setRec(Math.min(doc.rows.length - 1, rec + 1))} aria="Next record">▶</Btn>
          </span>
        )}
        <Drop label="Finish & Merge" open={menu === "finish"} disabled={!hasList} onToggle={() => setMenu(menu === "finish" ? "" : "finish")}>
          <Item onClick={() => { setMenu(""); setFinish(true); setRange({ kind: "all", from: 1, to: doc.rows.length || 1 }); }}>Edit Individual Documents…</Item>
          <Item disabled onClick={() => {}}>Print Documents…</Item>
          <Item disabled onClick={() => {}}>Send E-mail Messages…</Item>
        </Drop>
        {doc.merged && <Btn onClick={() => setShowMerged(true)}>📄 Letters ({doc.merged.count})</Btn>}
      </div>

      {/* ── Status ── */}
      <div style={{ fontSize: 11.5, color: "#605e5c", padding: "5px 10px", display: "flex", gap: 12, flexWrap: "wrap", background: "#faf9f8", borderBottom: `1px solid ${LINE}` }}>
        <span>Type: <b>{doc.mode ? LABEL[doc.mode] : "Normal document"}</b></span>
        <span>Recipients: <b>{hasList ? `${doc.rows.length} · ${doc.listFile}` : "none"}</b></span>
        <span>Fields in letter: <b>{fieldsIn(doc.body).length}</b></span>
        {doc.mergedFile && <span>Merged saved as <b>{doc.mergedFile}</b></span>}
      </div>
      {note && <div role="status" style={{ fontSize: 12.5, padding: "6px 10px", background: "#fff4ce", borderBottom: `1px solid ${LINE}` }}>{note}</div>}

      {/* ── Page ── */}
      <div style={{ padding: 12 }}>
        <div className="wsim-page" style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", maxWidth: 760, margin: "0 auto", padding: "18px 20px" }}>
          {doc.preview ? (
            <div style={{ whiteSpace: "pre-wrap", fontFamily: "Calibri, Arial, sans-serif", fontSize: 14.5, lineHeight: 1.6, minHeight: 360 }}>
              {fill(doc.rows[rec])}
            </div>
          ) : (
            <textarea ref={ta} value={doc.body} spellCheck={false}
              onChange={(e) => { update({ body: e.target.value }); track(); }}
              onSelect={track} onKeyUp={track} onClick={track} onFocus={track}
              aria-label="Letter"
              style={{ width: "100%", minHeight: 380, border: "none", outline: "none", resize: "vertical", boxSizing: "border-box",
                       fontFamily: "Calibri, Arial, sans-serif", fontSize: 14.5, lineHeight: 1.6, color: "#201f1e", background: "#fff" }} />
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#605e5c", textAlign: "center", marginTop: 6 }}>
          Click in the letter where a field goes, then use Insert Merge Field.
        </div>
      </div>

      {/* ── New Address List ── */}
      {draft && !custom && saveList === null && (
        <Dialog title={draft.fresh ? "New Address List" : "Edit Recipient List"} wide onClose={() => setDraft(null)}>
          <div style={{ fontSize: 12, color: "#605e5c", marginBottom: 6 }}>Type recipient information in the table. To add more entries, click New Entry.</div>
          <div style={{ overflow: "auto", maxHeight: "48vh", border: `1px solid ${LINE}` }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12.5, minWidth: "100%" }}>
              <thead>
                <tr>
                  <th style={th} />
                  {draft.columns.map((c, i) => <th key={i} style={th}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {draft.rows.map((r, ri) => (
                  <tr key={ri} style={{ background: selRow === ri ? "#deecf9" : "#fff" }} onClick={() => setSelRow(ri)}>
                    <td style={{ ...td, width: 18, color: "#605e5c", textAlign: "center" }}>{selRow === ri ? "▶" : ""}</td>
                    {draft.columns.map((_, ci) => (
                      <td key={ci} style={td}>
                        <input value={r[ci] || ""} onChange={(e) => setCell(ri, ci, e.target.value)} onFocus={() => setSelRow(ri)}
                          aria-label={`${draft.columns[ci]} row ${ri + 1}`}
                          style={{ width: 120, border: "none", outline: "none", fontSize: 12.5, padding: "4px 5px", background: "transparent" }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <Btn onClick={() => { setDraft({ ...draft, rows: [...draft.rows, Array(draft.columns.length).fill("")] }); setSelRow(draft.rows.length); }}>New Entry</Btn>
            <Btn disabled={draft.rows.length === 0} onClick={() => { const rows = draft.rows.filter((_, i) => i !== selRow); setDraft({ ...draft, rows }); setSelRow(Math.max(0, selRow - 1)); }}>Delete Entry</Btn>
            <Btn onClick={() => setCustom(true)}>Customize Columns…</Btn>
            <span style={{ flex: 1 }} />
            <Btn primary onClick={listOk}>OK</Btn>
            <Btn onClick={() => setDraft(null)}>Cancel</Btn>
          </div>
        </Dialog>
      )}

      {draft && custom && <CustomizeColumns draft={draft} onDone={(d) => { setDraft(d); setCustom(false); }} onCancel={() => setCustom(false)} />}

      {draft && saveList !== null && (
        <Dialog title="Save Address List" onClose={() => setSaveList(null)}>
          <div style={{ fontSize: 12.5, marginBottom: 6 }}>Save in: <b>My Data Sources</b></div>
          <label style={{ fontSize: 12.5 }}>File name
            <input autoFocus value={saveList} onChange={(e) => setSaveList(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && saveList.trim()) commitList(withExt(saveList, ".mdb")); }}
              style={inp} />
          </label>
          <div style={{ fontSize: 12, color: "#605e5c", marginTop: 4 }}>Save as type: Microsoft Office Address Lists (*.mdb)</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
            <Btn primary disabled={!saveList.trim()} onClick={() => commitList(withExt(saveList, ".mdb"))}>Save</Btn>
            <Btn onClick={() => setSaveList(null)}>Cancel</Btn>
          </div>
        </Dialog>
      )}

      {/* ── Merge to New Document ── */}
      {finish && (
        <Dialog title="Merge to New Document" onClose={() => setFinish(false)}>
          <div style={{ fontSize: 12.5, marginBottom: 6 }}>Merge records</div>
          {(["all", "current", "from"] as const).map((k) => (
            <label key={k} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, margin: "5px 0" }}>
              <input type="radio" checked={range.kind === k} onChange={() => setRange({ ...range, kind: k })} />
              {k === "all" ? "All" : k === "current" ? "Current record" : "From:"}
              {k === "from" && (
                <>
                  <input type="number" min={1} value={range.from} onChange={(e) => setRange({ ...range, kind: "from", from: Number(e.target.value) })} style={{ ...inp, width: 60, marginTop: 0 }} />
                  To: <input type="number" min={1} value={range.to} onChange={(e) => setRange({ ...range, kind: "from", to: Number(e.target.value) })} style={{ ...inp, width: 60, marginTop: 0 }} />
                </>
              )}
            </label>
          ))}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
            <Btn primary onClick={doFinish}>OK</Btn>
            <Btn onClick={() => setFinish(false)}>Cancel</Btn>
          </div>
        </Dialog>
      )}

      {/* ── Merged letters (Letters1) ── */}
      {showMerged && doc.merged && (
        <Dialog title={`${doc.mergedFile || "Letters1"} — ${doc.merged.count} letter${doc.merged.count === 1 ? "" : "s"}`} wide onClose={() => setShowMerged(false)}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 12.5 }}>💾 Save As</span>
            <input value={mergedName} onChange={(e) => setMergedName(e.target.value)} placeholder={doc.mergedFile.replace(/\.docx$/i, "") || "File name"}
              style={{ ...inp, width: 200, marginTop: 0 }} />
            <Btn primary disabled={!mergedName.trim()} onClick={() => { const f = withExt(mergedName, ".docx"); update({ mergedFile: f }); setMergedName(""); flash(`Merged document saved as ${f}`); }}>Save</Btn>
            {doc.mergedFile && <span style={{ fontSize: 12, color: "#107c10" }}>Saved as <b>{doc.mergedFile}</b></span>}
          </div>
          <div style={{ maxHeight: "55vh", overflowY: "auto", background: "#f3f2f1", padding: 8 }}>
            {mergedRows().map((r, i) => (
              <div key={i} style={{ background: "#fff", padding: "14px 16px", marginBottom: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                                    whiteSpace: "pre-wrap", fontFamily: "Calibri, Arial, sans-serif", fontSize: 13.5, lineHeight: 1.55 }}>
                {fill(r)}
                <div style={{ fontSize: 10.5, color: "#a19f9d", textAlign: "center", marginTop: 8 }}>— Page {i + 1} —</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><Btn onClick={() => setShowMerged(false)}>Close</Btn></div>
        </Dialog>
      )}
    </div>
  );
}

// ── Customize Address List (columns) ────────────────────────────────────────
function CustomizeColumns({ draft, onDone, onCancel }: { draft: Draft; onDone: (d: Draft) => void; onCancel: () => void }) {
  const [cols, setCols] = useState(draft.columns.map((c, i) => ({ name: c, from: i as number | null })));
  const [sel, setSel] = useState(0);
  const [ask, setAsk] = useState<null | { kind: "add" | "rename"; value: string }>(null);
  const [err, setErr] = useState("");

  function done() {
    const rows = draft.rows.map((r) => cols.map((c) => (c.from === null ? "" : r[c.from] || "")));
    onDone({ ...draft, columns: cols.map((c) => c.name), rows });
  }
  function confirmAsk() {
    if (!ask) return;
    const v = ask.value.trim();
    if (!v) { setErr("Type a field name."); return; }
    if (cols.some((c, i) => c.name.toLowerCase() === v.toLowerCase() && !(ask.kind === "rename" && i === sel))) { setErr("A field with this name already exists."); return; }
    if (ask.kind === "add") {
      const at = cols.length ? sel + 1 : 0;
      const next = [...cols.slice(0, at), { name: v, from: null }, ...cols.slice(at)];
      setCols(next); setSel(at);
    } else setCols(cols.map((c, i) => (i === sel ? { ...c, name: v } : c)));
    setAsk(null); setErr("");
  }
  const move = (d: number) => {
    const j = sel + d; if (j < 0 || j >= cols.length) return;
    const n = [...cols]; [n[sel], n[j]] = [n[j], n[sel]]; setCols(n); setSel(j);
  };

  return (
    <Dialog title="Customize Address List" onClose={onCancel}>
      <div style={{ fontSize: 12.5, marginBottom: 4 }}>Field Names</div>
      <div style={{ display: "flex", gap: 8 }}>
        <div role="listbox" style={{ flex: 1, border: `1px solid ${LINE}`, height: 230, overflowY: "auto", background: "#fff" }}>
          {cols.map((c, i) => (
            <div key={i} role="option" aria-selected={i === sel} onClick={() => setSel(i)}
              style={{ padding: "4px 8px", fontSize: 13, cursor: "pointer", background: i === sel ? "#0078d4" : "transparent", color: i === sel ? "#fff" : "#201f1e" }}>{c.name}</div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 100 }}>
          <Btn onClick={() => { setAsk({ kind: "add", value: "" }); setErr(""); }}>Add…</Btn>
          <Btn disabled={!cols.length} onClick={() => { const n = cols.filter((_, i) => i !== sel); setCols(n); setSel(Math.max(0, Math.min(sel, n.length - 1))); }}>Delete</Btn>
          <Btn disabled={!cols.length} onClick={() => { setAsk({ kind: "rename", value: cols[sel]?.name || "" }); setErr(""); }}>Rename…</Btn>
          <Btn disabled={sel <= 0} onClick={() => move(-1)}>Move Up</Btn>
          <Btn disabled={sel >= cols.length - 1} onClick={() => move(1)}>Move Down</Btn>
        </div>
      </div>
      {ask && (
        <div style={{ marginTop: 8, padding: 8, border: `1px solid ${LINE}`, background: "#faf9f8" }}>
          <label style={{ fontSize: 12.5 }}>{ask.kind === "add" ? "Type a name for your field" : "Rename field to"}
            <input autoFocus value={ask.value} onChange={(e) => setAsk({ ...ask, value: e.target.value })} onKeyDown={(e) => e.key === "Enter" && confirmAsk()} style={inp} />
          </label>
          {err && <div style={{ color: "#a4262c", fontSize: 12, marginTop: 4 }}>{err}</div>}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
            <Btn primary onClick={confirmAsk}>OK</Btn><Btn onClick={() => { setAsk(null); setErr(""); }}>Cancel</Btn>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
        <Btn primary onClick={done}>OK</Btn><Btn onClick={onCancel}>Cancel</Btn>
      </div>
    </Dialog>
  );
}

// ── Chhote hisse ────────────────────────────────────────────────────────────
const LABEL: Record<MergeMode, string> = { "": "Normal document", letters: "Letters", email: "E-mail Messages", envelopes: "Envelopes…", labels: "Labels…" };
const withExt = (name: string, ext: string) => {
  const n = name.trim().replace(/\.(mdb|accdb|docx|doc)$/i, "");
  return n + ext;
};
const th: CSSProperties = { background: "#f3f2f1", border: `1px solid ${LINE}`, padding: "5px 6px", fontWeight: 600, whiteSpace: "nowrap", textAlign: "left", position: "sticky", top: 0 };
const td: CSSProperties = { border: `1px solid ${LINE}`, padding: 0 };
const inp: CSSProperties = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: "6px 8px", border: `1px solid #8a8886`, borderRadius: 2, fontSize: 13, background: "#fff", color: "#201f1e" };

function Btn({ children, onClick, disabled, primary, on, aria }: { children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; on?: boolean; aria?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={aria} aria-pressed={on}
      style={{ padding: "6px 10px", fontSize: 12.5, borderRadius: 3, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1,
               border: `1px solid ${primary ? "#0078d4" : "#8a8886"}`, background: primary ? "#0078d4" : on ? "#c7e0f4" : "#fff",
               color: primary ? "#fff" : "#201f1e", fontWeight: primary ? 600 : 400, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}
function Drop({ label, open, onToggle, disabled, children }: { label: string; open: boolean; onToggle: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <Btn onClick={onToggle} disabled={disabled}>{label} ▾</Btn>
      {open && !disabled && (
        <div role="menu" style={{ position: "absolute", top: "100%", left: 0, zIndex: 20, background: "#fff", border: `1px solid ${LINE}`,
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.18)", minWidth: 190, marginTop: 2 }}>{children}</div>
      )}
    </span>
  );
}
function Item({ children, onClick, disabled, on }: { children: ReactNode; onClick: () => void; disabled?: boolean; on?: boolean }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", fontSize: 13, border: "none", cursor: disabled ? "default" : "pointer",
               background: on ? "#deecf9" : "transparent", color: disabled ? "#a19f9d" : "#201f1e" }}>
      {on ? "✓ " : ""}{children}
    </button>
  );
}
function Dialog({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 8px", overflowY: "auto" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: wide ? 820 : 420, border: `1px solid ${LINE}`, boxShadow: "0 8px 28px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: `1px solid ${LINE}` }}>
          <b style={{ flex: 1, fontSize: 13.5 }}>{title}</b>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: "#201f1e" }}>✕</button>
        </div>
        <div style={{ padding: 12 }}>{children}</div>
      </div>
    </div>
  );
}

/** Mock ke liye question paper: letter («Field» peele) + records ki table */
export function MergeBrief({ letter, columns, records }: { letter: string; columns: string[]; records: string[][] }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 800, margin: "8px 0 4px" }}>Recipient data</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12.5, width: "100%" }}>
          <thead><tr>{columns.map((c) => <th key={c} style={{ ...th, background: "var(--chip)", color: "var(--text)", border: "1px solid var(--line)" }}>{c}</th>)}</tr></thead>
          <tbody>{records.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={{ border: "1px solid var(--line)", padding: "4px 6px" }}>{v}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 800, margin: "10px 0 4px" }}>Letter (fields shown in «»)</div>
      <div style={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.55, background: "var(--chip)", borderRadius: 8, padding: "8px 10px" }}>
        {letter.split(/(«[^»]+»)/g).map((p, i) => p.startsWith("«")
          ? <b key={i} style={{ background: "rgba(255,171,0,0.35)", borderRadius: 3, padding: "0 2px" }}>{p}</b>
          : <span key={i}>{p}</span>)}
      </div>
    </div>
  );
}
