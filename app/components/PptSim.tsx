"use client";

/**
 * app/components/PptSim.tsx — MS PowerPoint jaisa chhota editor (practice).
 * Slides, layout, title (Bold / size), bullets aur kheench kar hilne wale text
 * box. Har badlaav par poora PptDoc model onChange se jaata hai — jaanch
 * lib/officeTasks me usi par hoti hai.
 */
import { useEffect, useRef, useState } from "react";
import { newSlide, type Layout, type PptDoc, type PSlide } from "@/lib/officeTasks";

const LAYOUTS: [Layout, string][] = [["title", "Title Slide"], ["content", "Title and Content"], ["titleOnly", "Title Only"], ["blank", "Blank"]];

export default function PptSim({ start, onChange }: { start: PptDoc; onChange: (d: PptDoc) => void }) {
  const [doc, setDoc] = useState<PptDoc>(start);
  const [cur, setCur] = useState(0);
  const [nameDraft, setNameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [newLayout, setNewLayout] = useState<Layout>("content");
  const canvas = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; x0: number; y0: number } | null>(null);

  useEffect(() => { onChange(doc); }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = doc.slides[Math.min(cur, doc.slides.length - 1)];
  const upd = (fn: (sl: PSlide) => PSlide) =>
    setDoc((d) => ({ ...d, slides: d.slides.map((x, i) => (i === Math.min(cur, d.slides.length - 1) ? fn({ ...x }) : x)) }));

  function addSlide() {
    setDoc((d) => {
      const slides = [...d.slides]; slides.splice(cur + 1, 0, newSlide(newLayout, "", true));
      return { ...d, slides };
    });
    setCur(cur + 1);
  }
  function delSlide() {
    if (doc.slides.length <= 1) { alert("A presentation needs at least one slide."); return; }
    setDoc((d) => ({ ...d, slides: d.slides.filter((_, i) => i !== cur), deletedTitles: [...d.deletedTitles, s.title] }));
    setCur(Math.max(0, cur - 1));
  }
  function addBox() {
    upd((x) => ({ ...x, boxes: [...x.boxes, { id: Math.random().toString(36).slice(2, 8), text: "", x: 30, y: 62, moved: false }] }));
  }
  function saveAs() {
    const n = nameDraft.trim().replace(/\.pptx$/i, ""); if (!n) return;
    setDoc((d) => ({ ...d, fileName: n + ".pptx" })); setSaving(false);
  }

  // Text box kheenchna (ungli ya mouse) — % me, taaki har screen par same
  function down(e: React.PointerEvent, id: string) {
    const b = s.boxes.find((x) => x.id === id); const r = canvas.current?.getBoundingClientRect();
    if (!b || !r) return;
    e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { id, dx: (e.clientX - r.left) / r.width * 100 - b.x, dy: (e.clientY - r.top) / r.height * 100 - b.y, x0: b.x, y0: b.y };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current; const r = canvas.current?.getBoundingClientRect(); if (!d || !r) return;
    const x = Math.max(0, Math.min(80, (e.clientX - r.left) / r.width * 100 - d.dx));
    const y = Math.max(0, Math.min(85, (e.clientY - r.top) / r.height * 100 - d.dy));
    upd((sl) => ({ ...sl, boxes: sl.boxes.map((b) => (b.id === d.id ? { ...b, x, y, moved: b.moved || Math.abs(x - d.x0) + Math.abs(y - d.y0) > 3 } : b)) }));
  }
  const up = () => { drag.current = null; };

  const btn = (label: string, on: () => void, title: string, extra: any = {}) => (
    <button type="button" title={title} aria-label={title} onClick={on}
      style={{ height: 32, padding: "0 9px", border: "1px solid #c9ccd3", borderRadius: 6, background: "#fff", color: "#222",
               fontSize: 12.5, cursor: "pointer", flexShrink: 0, ...extra }}>{label}</button>
  );
  const field = (v: string, on: (t: string) => void, ph: string, style: any, multi = false) => {
    const common = { value: v, placeholder: ph, onChange: (e: any) => on(e.target.value), spellCheck: false,
      style: { position: "absolute" as const, background: "transparent", border: "1px dashed #b9bec8", borderRadius: 4, color: "#111",
               resize: "none" as const, outline: "none", padding: "4px 8px", boxSizing: "border-box" as const, fontFamily: "Calibri, Carlito, Arial, sans-serif", ...style } };
    return multi ? <textarea {...common} /> : <input {...common} />;
  };
  const tSize = (pt: number) => `clamp(12px, ${pt / 13}vw, ${pt * 1.1}px)`;

  return (
    <div style={{ border: "1px solid #c9ccd3", borderRadius: 10, overflow: "hidden", background: "#e9ebef" }}>
      <div style={{ display: "flex", gap: 5, padding: 6, overflowX: "auto", borderBottom: "1px solid #d7d9de", alignItems: "center", background: "#f3f4f6" }}>
        <select value={newLayout} onChange={(e) => setNewLayout(e.target.value as Layout)} title="Layout for the new slide"
          style={{ height: 32, border: "1px solid #c9ccd3", borderRadius: 6, fontSize: 12.5, flexShrink: 0 }}>
          {LAYOUTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {btn("+ New slide", addSlide, "New slide", { fontWeight: 700 })}
        {btn("🗑 Delete slide", delSlide, "Delete slide")}
        <select value={s.layout} onChange={(e) => upd((x) => ({ ...x, layout: e.target.value as Layout }))} title="Change layout"
          style={{ height: 32, border: "1px solid #c9ccd3", borderRadius: 6, fontSize: 12.5, flexShrink: 0 }}>
          {LAYOUTS.map(([k, l]) => <option key={k} value={k}>Layout: {l}</option>)}
        </select>
        {btn("T Text box", addBox, "Add a text box")}
        {btn("B", () => upd((x) => ({ ...x, titleBold: !x.titleBold })), "Bold heading", { fontWeight: 800, background: s.titleBold ? "#ffe8b3" : "#fff" })}
        {btn("A+", () => upd((x) => ({ ...x, titleSize: Math.min(60, x.titleSize + 4) })), "Bigger heading")}
        {btn("A−", () => upd((x) => ({ ...x, titleSize: Math.max(16, x.titleSize - 4) })), "Smaller heading")}
        {btn("💾 Save As", () => { setNameDraft(doc.fileName.replace(/\.pptx$/i, "")); setSaving(!saving); }, "Save As", { fontWeight: 700 })}
      </div>
      {saving && (
        <div style={{ display: "flex", gap: 6, padding: 8, alignItems: "center", background: "#fff", borderBottom: "1px solid #d7d9de", fontSize: 13, color: "#222" }}>
          File name <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveAs()}
            style={{ flex: 1, minWidth: 0, padding: 6 }} autoCapitalize="none" autoCorrect="off" />.pptx
          {btn("Save", saveAs, "Save", { fontWeight: 700 })}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, padding: 6, overflowX: "auto", background: "#dfe2e7" }}>
        {doc.slides.map((x, i) => (
          <button key={x.id} type="button" onClick={() => setCur(i)}
            style={{ flexShrink: 0, width: 96, height: 54, borderRadius: 5, cursor: "pointer", fontSize: 10, padding: 4, textAlign: "left",
                     border: i === cur ? "2px solid #d97706" : "1px solid #b9bec8", background: "#fff", color: "#333", overflow: "hidden" }}>
            <b>{i + 1}</b> {x.title || <i style={{ color: "#999" }}>({LAYOUTS.find((l) => l[0] === x.layout)?.[1]})</i>}
          </button>
        ))}
      </div>

      <div style={{ padding: 10 }}>
        <div ref={canvas} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", touchAction: drag.current ? "none" : "auto" }}>
          {s.layout !== "blank" && field(s.title, (t) => upd((x) => ({ ...x, title: t })), "Click to add title", {
            left: "6%", width: "88%", top: s.layout === "title" ? "30%" : "6%", height: "18%",
            fontSize: tSize(s.titleSize), fontWeight: s.titleBold ? 800 : 400, textAlign: s.layout === "title" ? "center" : "left" })}
          {s.layout === "title" && field(s.subtitle, (t) => upd((x) => ({ ...x, subtitle: t })), "Click to add subtitle", {
            left: "15%", width: "70%", top: "52%", height: "13%", fontSize: tSize(18), textAlign: "center" })}
          {s.layout === "content" && field(s.bullets.join("\n"), (t) => upd((x) => ({ ...x, bullets: t.split("\n") })),
            "Click to add text — one bullet point per line", { left: "6%", width: "88%", top: "28%", height: "64%", fontSize: tSize(18), lineHeight: 1.5 }, true)}
          {s.boxes.map((b) => (
            <div key={b.id} style={{ position: "absolute", left: `${b.x}%`, top: `${b.y}%`, width: "30%", zIndex: 5 }}>
              {/* Asli <button>: phone par Chrome touch ko paas ke "tap karne layak"
                  element (jaise subtitle ka input) par khiska deta hai — saadha
                  div hota to ungli ka drag neeche ke input ko chala jaata. */}
              <button type="button" onPointerDown={(e) => down(e, b.id)} title="Drag to move" aria-label="Drag to move"
                style={{ display: "block", width: "100%", height: 22, padding: 0, border: "none", background: "#d97706",
                         borderRadius: "4px 4px 0 0", cursor: "move", touchAction: "none",
                         fontSize: 10, color: "#fff", textAlign: "center", lineHeight: "22px" }}>✥ drag to move</button>
              <textarea value={b.text} placeholder="Text box" spellCheck={false}
                onChange={(e) => upd((x) => ({ ...x, boxes: x.boxes.map((y) => (y.id === b.id ? { ...y, text: e.target.value } : y)) }))}
                style={{ width: "100%", height: 44, resize: "none", border: "1px solid #d97706", outline: "none", fontSize: 13,
                         padding: 4, boxSizing: "border-box", fontFamily: "Calibri, Carlito, Arial, sans-serif", background: "#fff" }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
          Slide {cur + 1} of {doc.slides.length} · {doc.fileName ? <>💾 Saved as <b>{doc.fileName}</b></> : "Not saved yet — use Save As."}
        </div>
      </div>
    </div>
  );
}
