"use client";

// CA quiz — poori screen par. Ek baar me ek sawaal (mobile par aaram se),
// upar number wali patti se kisi bhi sawaal par jao. Submit ke baad score +
// har sawaal ki explanation (Answer / Background / Static GK / Don't confuse).
// Backend: GET /ca/quiz (answer ke bina), POST /ca/quiz/submit.

import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/config";

type Q = {
  id: number; ref_no: string; q_type: string; question_en: string; question_hi: string;
  option_a_en: string; option_a_hi: string; option_b_en: string; option_b_hi: string;
  option_c_en: string; option_c_hi: string; option_d_en: string; option_d_hi: string;
};
type Res = {
  total: number; correct: number; wrong: number; skipped: number; percent: number;
  results: { id: number; your: string | null; correct: string; status: string; explanation_en?: string; explanation_hi?: string }[];
};

const KEYS = ["A", "B", "C", "D"] as const;
const QT_COLOR: Record<string, string> = { Current: "#2e7d46", Static: "#1c3366", Statement: "#c0392b" };
const LABEL_COLOR: Record<string, string> = {
  Answer: "#2e7d46", Background: "inherit", "Static GK": "#b7791f", "Don't confuse": "#c0392b",
  "उत्तर": "#2e7d46", "पृष्ठभूमि": "inherit", "स्टैटिक GK": "#b7791f", "इनसे भ्रमित न हों": "#c0392b",
};

function Lines({ text }: { text: string }) {
  return <>{String(text || "").split("<br>").map((l, i) => <span key={i} style={{ display: "block" }}>{l}</span>)}</>;
}

function Explain({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div style={{ display: "grid", gap: 5 }}>
      {text.split("<br>").map((part, i) => {
        const at = part.indexOf(":");
        const lab = at > 0 ? part.slice(0, at).trim() : "";
        if (lab && LABEL_COLOR[lab] !== undefined) {
          return <div key={i}><b style={{ color: LABEL_COLOR[lab] }}>{lab}:</b> {part.slice(at + 1).trim()}</div>;
        }
        return <div key={i}>{part}</div>;
      })}
    </div>
  );
}

export default function CAQuiz({ scope, k, title, lang, qs, ident, onClose }: {
  scope: "day" | "block"; k: string; title: string; lang: "both" | "en" | "hi";
  ident: { user_id?: number; visitor?: string; platform?: string };
  qs: (extra?: Record<string, string | number | undefined>) => string; onClose: () => void;
}) {
  const [qsList, setQsList] = useState<Q[] | null>(null);
  const [err, setErr] = useState("");
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "wrong" | "skipped">("all");
  const t0 = useRef(Date.now());

  useEffect(() => {
    document.body.style.overflow = "hidden";
    fetch(`${API_URL}/ca/quiz?${qs({ scope, key: k })}`).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || "Quiz nahi khula");
      if (d.locked) throw new Error("Quiz ke liye login kijiye");
      if (!d.questions?.length) throw new Error("Is ke liye abhi quiz nahi hai");
      setQsList(d.questions);
      t0.current = Date.now();
    }).catch((e) => setErr(e.message || "Quiz nahi khula"));
    return () => { document.body.style.overflow = ""; };
  }, [scope, k, qs]);

  async function submit() {
    if (!qsList) return;
    const left = qsList.length - Object.keys(ans).length;
    if (left > 0 && !confirm(`${left} sawaal chhoote hain. Phir bhi submit karein?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/ca/quiz/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ident, scope, key: k, answers: ans, time_sec: Math.round((Date.now() - t0.current) / 1000) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || "Submit nahi hua");
      setRes(d);
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      alert(e.message || "Submit nahi hua — dobara kariye");
    }
    setBusy(false);
  }

  const q = qsList?.[i];
  const showEn = lang !== "hi";
  const showHi = lang !== "en";
  const opt = (x: Q, key: string) => ({ en: (x as any)[`option_${key.toLowerCase()}_en`], hi: (x as any)[`option_${key.toLowerCase()}_hi`] });
  const rmap = Object.fromEntries((res?.results || []).map((r) => [r.id, r]));

  return (
    <div className="caq">
      <style dangerouslySetInnerHTML={{ __html: QCSS }} />
      <div className="caq-top">
        <button className="caq-x" onClick={onClose} aria-label="Band karo">✕</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="caq-title">{title}</div>
          {qsList && !res && <div className="caq-sub">{Object.keys(ans).length}/{qsList.length} jawab diye</div>}
          {res && <div className="caq-sub">Result</div>}
        </div>
        {qsList && !res && <button className="caq-btn caq-gold" onClick={submit} disabled={busy}>{busy ? "…" : "Submit"}</button>}
      </div>

      <div className="caq-body">
        {err && <div className="caq-card" style={{ textAlign: "center" }}>{err}<div style={{ marginTop: 12 }}><button className="caq-btn" onClick={onClose}>Wapas</button></div></div>}
        {!err && !qsList && <div className="caq-card caq-load">Quiz aa raha hai…</div>}

        {/* ── Sawaal ── */}
        {qsList && q && !res && (
          <>
            <div className="caq-pal">
              {qsList.map((x, n) => (
                <button key={x.id} onClick={() => setI(n)}
                  className={`${n === i ? "cur " : ""}${ans[x.id] ? "done" : ""}`}>{n + 1}</button>
              ))}
            </div>
            <div className="caq-card">
              <div className="caq-meta">
                <span>Q{i + 1} / {qsList.length}</span>
                <span style={{ color: QT_COLOR[q.q_type] || "inherit" }}>{q.q_type}</span>
              </div>
              {showEn && <div className="caq-q"><Lines text={q.question_en} /></div>}
              {showHi && <div className={showEn ? "caq-qhi" : "caq-q"}><Lines text={q.question_hi} /></div>}
              <div className="caq-opts">
                {KEYS.map((key) => {
                  const o = opt(q, key);
                  const on = ans[q.id] === key;
                  return (
                    <button key={key} className={`caq-opt${on ? " on" : ""}`}
                      onClick={() => setAns((a) => ({ ...a, [q.id]: on ? "" : key }))}>
                      <span className="caq-k">{key}</span>
                      <span>{showEn && o.en}{showEn && showHi && o.hi && o.hi !== o.en && <em> / {o.hi}</em>}{!showEn && o.hi}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="caq-nav">
              <button className="caq-btn" disabled={i === 0} onClick={() => setI(i - 1)}>← Pichhla</button>
              {i < qsList.length - 1
                ? <button className="caq-btn caq-gold" onClick={() => setI(i + 1)}>Agla →</button>
                : <button className="caq-btn caq-gold" onClick={submit} disabled={busy}>Submit</button>}
            </div>
          </>
        )}

        {/* ── Result ── */}
        {res && qsList && (
          <>
            <div className="caq-card caq-score">
              <div className="caq-big">{res.correct}<span>/{res.total}</span></div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{res.percent}%</div>
              <div className="caq-pills">
                <span style={{ color: "#2e7d46" }}>✓ {res.correct} sahi</span>
                <span style={{ color: "#c0392b" }}>✗ {res.wrong} galat</span>
                <span>– {res.skipped} chhode</span>
              </div>
            </div>
            <div className="caq-filter">
              {([["all", "Sab"], ["wrong", "Galat"], ["skipped", "Chhode"]] as const).map(([f, t]) => (
                <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{t}</button>
              ))}
            </div>
            {qsList.map((x, n) => {
              const r = rmap[x.id];
              if (!r || (filter !== "all" && r.status !== filter)) return null;
              return (
                <div key={x.id} className={`caq-card caq-r ${r.status}`}>
                  <div className="caq-meta"><span>Q{n + 1}</span><span style={{ color: QT_COLOR[x.q_type] || "inherit" }}>{x.q_type}</span>
                    <span style={{ marginLeft: "auto" }}>{r.status === "correct" ? "✓ Sahi" : r.status === "wrong" ? "✗ Galat" : "– Chhoda"}</span></div>
                  {showEn && <div className="caq-q"><Lines text={x.question_en} /></div>}
                  {showHi && <div className={showEn ? "caq-qhi" : "caq-q"}><Lines text={x.question_hi} /></div>}
                  <div className="caq-opts">
                    {KEYS.map((key) => {
                      const o = opt(x, key);
                      const cls = key === r.correct ? " right" : key === r.your ? " bad" : "";
                      return (
                        <div key={key} className={`caq-opt ro${cls}`}>
                          <span className="caq-k">{key}</span>
                          <span>{showEn && o.en}{showEn && showHi && o.hi && o.hi !== o.en && <em> / {o.hi}</em>}{!showEn && o.hi}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="caq-exp">
                    {showEn && <Explain text={r.explanation_en} />}
                    {showHi && <div style={{ marginTop: showEn ? 8 : 0 }} className="caq-qhi"><Explain text={r.explanation_hi} /></div>}
                  </div>
                </div>
              );
            })}
            <div className="caq-nav"><button className="caq-btn caq-gold" onClick={onClose}>Done</button></div>
          </>
        )}
      </div>
    </div>
  );
}

const QCSS = `
.caq{position:fixed;inset:0;z-index:80;background:var(--bg);color:var(--text);display:flex;flex-direction:column}
.caq button{cursor:pointer;font-family:inherit;color:inherit}
.caq .caq-top{display:flex;gap:10px;align-items:center;padding:10px 14px;background:linear-gradient(135deg,#0b1b3a,#1c3366);color:#fff}
.caq .caq-x{border:none;background:rgba(255,255,255,.12);color:#fff !important;width:34px;height:34px;border-radius:10px;font-size:15px}
.caq .caq-title{font-weight:800;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.caq .caq-sub{font-size:12px;color:#c9d3e6}
.caq .caq-body{flex:1;overflow:auto;padding:14px;max-width:820px;width:100%;margin:0 auto;box-sizing:border-box}
.caq .caq-card{background:var(--card);border:1px solid var(--v2-line,rgba(0,0,0,.1));border-radius:16px;padding:16px;margin-bottom:12px}
.caq .caq-load{text-align:center;color:var(--muted)}
.caq .caq-pal{display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;scrollbar-width:none}
.caq .caq-pal button{min-width:34px;height:34px;border-radius:9px;border:1px solid var(--v2-line,rgba(0,0,0,.12));background:var(--card);font-weight:700;font-size:12.5px}
.caq .caq-pal button.done{background:#2e7d4622;border-color:#2e7d46}
.caq .caq-pal button.cur{outline:2px solid #ffab00;outline-offset:1px}
.caq .caq-meta{display:flex;gap:10px;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px}
.caq .caq-q{font-size:16px;font-weight:600;line-height:1.55}
.caq .caq-qhi{font-size:14.5px;line-height:1.6;color:var(--text2,#4c4536);margin-top:6px}
.caq .caq-opts{display:grid;gap:8px;margin-top:14px}
.caq .caq-opt{display:flex;gap:10px;align-items:flex-start;text-align:left;border:1px solid var(--v2-line,rgba(0,0,0,.12));background:var(--card);border-radius:12px;padding:11px 12px;font-size:14.5px;line-height:1.45}
.caq .caq-opt em{font-style:normal;color:var(--muted)}
.caq .caq-opt.on{border-color:#ffab00;background:var(--v2-gold-wash,#fff6de)}
.caq .caq-opt.right{border-color:#2e7d46;background:#2e7d461a}
.caq .caq-opt.bad{border-color:#c0392b;background:#c0392b14}
.caq .caq-k{flex-shrink:0;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:var(--v2-chip,#efebe0);font-weight:800;font-size:12px}
.caq .caq-opt.on .caq-k{background:#ffab00;color:#1a1205}
.caq .caq-opt.right .caq-k{background:#2e7d46;color:#fff}.caq-opt.bad .caq-k{background:#c0392b;color:#fff}
.caq .caq-nav{display:flex;justify-content:space-between;gap:10px;padding:4px 0 30px}
.caq .caq-btn{border:1px solid var(--v2-line,rgba(0,0,0,.15));background:var(--card);border-radius:10px;padding:10px 16px;font-weight:800;font-size:14px}
.caq .caq-btn:disabled{opacity:.45}
.caq .caq-gold{background:#ffab00 !important;border-color:#ffab00 !important;color:#1a1205 !important}
.caq .caq-score{text-align:center}
.caq .caq-big{font-size:44px;font-weight:800;line-height:1}.caq-big span{font-size:20px;color:var(--muted)}
.caq .caq-pills{display:flex;gap:14px;justify-content:center;margin-top:8px;font-weight:700;font-size:13.5px}
.caq .caq-filter{display:flex;gap:6px;margin-bottom:10px}
.caq .caq-filter button{border:1px solid var(--v2-line,rgba(0,0,0,.12));background:var(--card);border-radius:999px;padding:6px 14px;font-weight:700;font-size:12.5px}
.caq .caq-filter .on{background:var(--text);color:var(--bg) !important}
.caq .caq-r.correct{border-left:4px solid #2e7d46}.caq-r.wrong{border-left:4px solid #c0392b}.caq-r.skipped{border-left:4px solid #9a917f}
.caq .caq-exp{margin-top:12px;border-top:1px dashed var(--v2-line,rgba(0,0,0,.15));padding-top:10px;font-size:13.5px;line-height:1.6}
`;
