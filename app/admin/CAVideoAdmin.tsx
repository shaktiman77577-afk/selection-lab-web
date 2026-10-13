"use client";

/**
 * CAVideoAdmin.tsx — Current Affairs admin ka "🎬 Video" tab (daily Shorts, 9:16).
 *
 * Script daily package ke ===SCRIPT=== hisse se aata hai (daily prompt likhta hai,
 * Roman Hinglish). Yahan: din chuno → slides dekho → script theek karo → download
 * (script TXT, slides PNG zip, PDF, PPT).
 * Backend: routers/ca_video.py (/api/ca/admin/video/...), slides services/ca_video.py.
 */

import { useEffect, useState, type CSSProperties } from "react";

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
  background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit",
};
const btn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 9,
  padding: "8px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const goldBtn: CSSProperties = { ...btn, background: GOLD, color: "#1a1a1a", border: "none" };
const box: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12 };
const label: CSSProperties = { fontSize: 11.5, color: MUTED, fontWeight: 700, margin: "8px 0 4px" };

type Row = { part: string; ref_no?: string | null; title: string; points?: string | null; voiceover: string };

const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayName = (d: string) => `${Number(d.slice(8, 10))} ${MN[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const words = (s?: string | null) => String(s || "").replace(/<br\s*\/?>/g, " ").split(/\s+/).filter(Boolean).length;
const DEVA = /[ऀ-ॿ]/;

function saveB64(name: string, mime: string, b64: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function Msg({ text, ok }: { text: string; ok?: boolean }) {
  if (!text) return null;
  const c = ok ? GREEN : RED;
  return <div style={{ background: `${c}1a`, border: `1px solid ${c}55`, color: c, borderRadius: 10, padding: "9px 12px", fontSize: 13, marginBottom: 10 }}>{text}</div>;
}

const FILES: [string, string, string][] = [
  ["zip", "🖼️ Slides PNG (zip)", "CapCut me daalne ke liye — har slide 1080×1920 + script"],
  ["txt", "📄 Script (.txt)", "Screen par kya, bolna kya + YouTube title"],
  ["pptx", "📊 PPT", "Text badalna ho to — bolne wali line Notes me"],
  ["pdf", "📕 PDF", "Saari slides ek file me"],
];

export default function CAVideoAdmin({ api }: { api: ApiFn }) {
  const [list, setList] = useState<any>(null);
  const [day, setDay] = useState("");
  const [d, setD] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [slides, setSlides] = useState<string[] | null>(null);
  const [big, setBig] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });

  function loadList(pickFirst = false) {
    api("/ca/admin/video").then((x) => {
      setList(x);
      if (pickFirst && x.days?.[0]) setDay(x.days[0].date);
    }).catch((e) => setMsg({ t: e.message }));
  }
  useEffect(() => { loadList(true); }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadDay(dd: string) {
    setD(null); setSlides(null); setMsg({ t: "" });
    api(`/ca/admin/video/${dd}`).then((x) => {
      setD(x);
      setRows((x.rows || []).map((r: any) => ({ part: r.part, ref_no: r.ref_no, title: r.title, points: r.points, voiceover: r.voiceover })));
      setDirty(false);
      preview(dd);
    }).catch((e) => setMsg({ t: e.message }));
  }
  useEffect(() => { if (day) loadDay(day); }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  async function preview(dd = day) {
    setBusy("preview");
    try { const r = await api(`/ca/admin/video/${dd}/preview`, "POST", {}); setSlides(r.slides || []); }
    catch (e: any) { setMsg({ t: e.message }); }
    setBusy("");
  }

  async function download(kind: string) {
    if (dirty && !confirm("Badlav abhi save nahi hue — purane script se file banegi. Phir bhi?")) return;
    setBusy(kind); setMsg({ t: "" });
    try {
      const r = await api(`/ca/admin/video/${day}/file`, "POST", { kind });
      saveB64(r.file_name, r.mime, r.b64);
      setMsg({ t: `${r.file_name} (${r.size_kb >= 1024 ? `${(r.size_kb / 1024).toFixed(1)} MB` : `${r.size_kb} KB`}) download ho gayi`, ok: true });
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy("");
  }

  async function save() {
    for (const [i, r] of rows.entries()) {
      if (!r.title.trim() || !r.voiceover.trim()) { setMsg({ t: `Slide ${i + 1}: title aur bolne wali line dono chahiye` }); return; }
      if (DEVA.test(`${r.title} ${r.points || ""} ${r.voiceover}`)) { setMsg({ t: `Slide ${i + 1}: Hindi lipi (Devanagari) hai — Roman Hinglish likhiye` }); return; }
    }
    setBusy("save"); setMsg({ t: "" });
    try {
      await api(`/ca/admin/video/${day}`, "PUT", { rows });
      setMsg({ t: "Script save ho gaya", ok: true }); setDirty(false); loadList(); preview();
      const x = await api(`/ca/admin/video/${day}`); setD(x);
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy("");
  }

  async function remove() {
    if (!confirm(`${dayName(day)} ka video script hata dein?`)) return;
    try { await api(`/ca/admin/video/${day}`, "DELETE"); setDay(""); setD(null); setSlides(null); loadList(true); }
    catch (e: any) { setMsg({ t: e.message }); }
  }

  function upd(i: number, patch: Partial<Row>) { setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r))); setDirty(true); }
  function move(i: number, dir: number) {
    const j = i + dir;
    if (j < 1 || j >= rows.length - 1 || i < 1 || i >= rows.length - 1) return;      // INTRO pehle, OUTRO aakhir me hi
    const n = [...rows]; [n[i], n[j]] = [n[j], n[i]]; setRows(n); setDirty(true);
  }
  function addNews() {
    const n = [...rows];
    n.splice(Math.max(1, n.length - 1), 0, { part: "NEWS", ref_no: "", title: "", points: "", voiceover: "" });
    setRows(n); setDirty(true);
  }

  if (!list) return msg.t ? <Msg text={msg.t} /> : <div style={{ color: MUTED }}>Loading…</div>;
  if (list.setup_needed) return <div style={box}><Msg text="Video ke tables abhi nahi bane. Supabase SQL Editor me sql/2026-10-13_ca_pricing_video.sql chalaiye." /></div>;

  const totalWords = rows.reduce((a, r) => a + words(r.voiceover), 0);
  const nNews = rows.filter((r) => r.part === "NEWS").length;
  const cards: Record<string, any> = d?.cards || {};
  const dayCards: any[] = d?.day_cards || [];

  return (
    <div>
      <Msg text={msg.t} ok={msg.ok} />
      <div style={{ ...box, fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>
        🎬 Har din ka <b style={{ color: "#fff" }}>Shorts video (9:16, 60–90 sec)</b>. Script daily package ke <b style={{ color: "#fff" }}>===SCRIPT===</b> hisse se aata hai
        (naya daily prompt likhta hai — Roman Hinglish, top 8–10 news). Upload ke baad yahan din chuniye → slides dekhiye → zaroorat ho to script theek kijiye → download.
      </div>

      {(list.days || []).length === 0 ? (
        <div style={{ ...box, color: MUTED, fontSize: 13 }}>
          Abhi kisi din ka script nahi hai. Naye daily prompt se package banaiye (usme SCRIPT hissa hota hai) aur ⬆️ Upload se daaliye.
          Purane (monthly) data me script nahi hota.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
          {list.days.map((x: any) => (
            <button key={x.date} onClick={() => setDay(x.date)}
              style={{ ...(day === x.date ? goldBtn : btn), flexShrink: 0, textAlign: "left", lineHeight: 1.3 }}>
              <div>{dayName(x.date)}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.8 }}>{x.news} news · ~{x.sec}s</div>
            </button>
          ))}
        </div>
      )}

      {day && !d && !msg.t && <div style={{ color: MUTED }}>Loading…</div>}
      {d && (
        <>
          <div style={box}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, fontWeight: 800 }}>{dayName(day)} · {rows.length} slides · {nNews} news</div>
              <span style={{ fontSize: 12, color: totalWords > 240 || totalWords < 140 ? YELLOW : GREEN, fontWeight: 700 }}>
                ~{Math.round(totalWords / 2.6)} sec ({totalWords} words)
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              {FILES.map(([k, t, h]) => (
                <button key={k} style={{ ...(k === "zip" ? goldBtn : btn), textAlign: "left", padding: "10px 12px" }} disabled={!!busy} onClick={() => download(k)}>
                  <div>{busy === k ? "Ban raha hai…" : t}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.8, marginTop: 2 }}>{h}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={box}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <div style={{ flex: 1, fontWeight: 800 }}>👁️ Slides</div>
              <button style={btn} disabled={!!busy} onClick={() => preview()}>{busy === "preview" ? "…" : "↻ Dobara"}</button>
            </div>
            {!slides && <div style={{ color: MUTED, fontSize: 12.5 }}>Slides ban rahi hain…</div>}
            {slides && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
                {slides.map((s, i) => (
                  <img key={i} src={s} alt={`Slide ${i + 1}`} onClick={() => setBig(i)}
                    style={{ width: 120, height: 213, objectFit: "cover", borderRadius: 8, flexShrink: 0, cursor: "zoom-in", border: "1px solid rgba(255,255,255,0.12)" }} />
                ))}
              </div>
            )}
            {dirty && <div style={{ fontSize: 11.5, color: YELLOW, marginTop: 6 }}>Script badla hai — save karne ke baad slides naye banenge.</div>}
          </div>

          <div style={box}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              <div style={{ flex: 1, fontWeight: 800 }}>✏️ Script</div>
              <button style={btn} onClick={addNews}>+ News slide</button>
              <button style={{ ...btn, color: RED, borderColor: `${RED}55` }} onClick={remove}>🗑 Script hatao</button>
            </div>
            <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 8 }}>Sirf Roman Hinglish (English letters). Points: har line ek point (2–3). News ki bolne wali line 15–25 words.</div>
            {rows.map((r, i) => {
              const c = r.ref_no ? cards[r.ref_no] : null;
              const w = words(r.voiceover);
              const n = rows.slice(0, i + 1).filter((x) => x.part === "NEWS").length;
              return (
                <div key={i} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#111", background: r.part === "NEWS" ? GOLD : "#8fb3ff", borderRadius: 5, padding: "2px 7px" }}>
                      {i + 1} · {r.part === "NEWS" ? `NEWS ${n}` : r.part}
                    </span>
                    <span style={{ flex: 1 }} />
                    {r.part === "NEWS" && (
                      <>
                        <button style={{ ...btn, padding: "3px 8px" }} disabled={i <= 1} onClick={() => move(i, -1)}>↑</button>
                        <button style={{ ...btn, padding: "3px 8px" }} disabled={i >= rows.length - 2} onClick={() => move(i, 1)}>↓</button>
                        <button style={{ ...btn, padding: "3px 8px", color: RED, borderColor: `${RED}55` }} onClick={() => { setRows(rows.filter((_, j) => j !== i)); setDirty(true); }}>✕</button>
                      </>
                    )}
                  </div>
                  {r.part === "NEWS" && (
                    <>
                      <div style={label}>Kis card ki news</div>
                      <select style={input} value={r.ref_no || ""} onChange={(e) => upd(i, { ref_no: e.target.value })}>
                        <option value="">— card chuniye —</option>
                        {dayCards.map((x) => <option key={x.ref_no} value={x.ref_no}>{x.important ? "★ " : ""}{x.ref_no} · {String(x.stem_en || "").replace(/[\s—–-]+$/, "").slice(0, 70)} → {x.answer_en}</option>)}
                      </select>
                      {c && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>Card: {String(c.stem_en || "").replace(/[\s—–-]+$/, "")} → <b style={{ color: GREEN }}>{c.answer_en}</b></div>}
                    </>
                  )}
                  <div style={label}>Screen par heading {r.part === "NEWS" ? "(7 words tak)" : ""}</div>
                  <input style={input} value={r.title} onChange={(e) => upd(i, { title: e.target.value })} />
                  <div style={label}>Points (har line ek)</div>
                  <textarea style={{ ...input, resize: "vertical" }} rows={3} value={String(r.points || "").replace(/<br\s*\/?>/g, "\n")}
                    onChange={(e) => upd(i, { points: e.target.value.split("\n").join("<br>") })} />
                  <div style={label}>Bolna hai (voiceover) · <span style={{ color: r.part === "NEWS" && (w < 12 || w > 30) ? YELLOW : MUTED }}>{w} words</span></div>
                  <textarea style={{ ...input, resize: "vertical" }} rows={3} value={r.voiceover} onChange={(e) => upd(i, { voiceover: e.target.value })} />
                </div>
              );
            })}
            <div style={{ position: "sticky", bottom: 0, display: "flex", gap: 8, alignItems: "center", background: CARD, padding: "10px 0 4px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button style={goldBtn} disabled={busy === "save"} onClick={save}>{busy === "save" ? "Saving…" : dirty ? "💾 Script save karo" : "Save"}</button>
              {dirty && <span style={{ fontSize: 11.5, color: YELLOW }}>Badlav abhi save nahi hue</span>}
            </div>
          </div>
        </>
      )}

      {big !== null && slides && (
        <div onClick={() => setBig(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <button style={btn} onClick={(e) => { e.stopPropagation(); setBig(Math.max(0, big - 1)); }}>←</button>
          <img src={slides[big]} alt="" style={{ maxHeight: "90vh", maxWidth: "70vw", borderRadius: 10 }} />
          <button style={btn} onClick={(e) => { e.stopPropagation(); setBig(Math.min(slides.length - 1, big + 1)); }}>→</button>
        </div>
      )}
    </div>
  );
}
