"use client";

/**
 * ExtractorAdmin.tsx  --  PDF se questions, aur TSV ka Hindi
 *
 * page.tsx me:  <ExtractorAdmin api={api} />
 *
 * Dono kaam background job ke roop me chalte hain. Yahan se file jaati hai,
 * job_id wapas aata hai, aur ye screen har 3 second progress poochhti rehti
 * hai. Poora hone par TSV download ho jaati hai.
 *
 * Nateeja TSV hi rehta hai, seedha bank me nahi jata — admin Sheets me dekh
 * kar sudhaar le, phir Upload Qs se chadhaye.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { API_URL } from "@/lib/config";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";
const TOKEN_KEY = "sl_admin_token";

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
  borderRadius: 10, padding: "9px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const cardBox: CSSProperties = {
  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{hint}</div> : null}
    </label>
  );
}

function Msg({ text, kind = "error" }: { text: string; kind?: "error" | "ok" | "warn" }) {
  if (!text) return null;
  const c = kind === "ok" ? GREEN : kind === "warn" ? GOLD : RED;
  return (
    <div style={{ background: `${c}1a`, border: `1px solid ${c}55`, color: c,
      borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 10, lineHeight: 1.55 }}>
      {text}
    </div>
  );
}

function authHeaders() {
  return { Authorization: `Bearer ${typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) || ""}` };
}

// ===========================================================================
export default function ExtractorAdmin({ api }: { api: ApiFn }) {
  const [view, setView] = useState<"pdf" | "translate" | "jobs">("pdf");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [ready, setReady] = useState<any | null>(null);

  useEffect(() => {
    api("/extractor/status").then(setReady).catch((e) => setErr(e.message));
  }, []);

  function flash(m: string) { setOk(m); setTimeout(() => setOk(""), 5000); }

  const missing: string[] = [];
  if (ready) {
    if (!ready.anthropic_key) missing.push("ANTHROPIC_API_KEY");
    if (!ready.anthropic_lib) missing.push("anthropic package");
    if (!ready.pdf_libs) missing.push("pdfplumber + pymupdf");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {([["pdf", "📕 PDF → Questions"], ["translate", "🔤 Translate"], ["jobs", "📋 Jobs"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setView(k); setErr(""); }}
            style={view === k ? { ...goldBtn, padding: "9px 14px" } : ghostBtn}>{l}</button>
        ))}
      </div>

      {missing.length > 0 && (
        <Msg kind="error" text={`Ye abhi nahi laga hai: ${missing.join(", ")} — Railway me set/deploy kijiye, warna job fail hogi.`} />
      )}
      {ready && !ready.imgbb_key && (
        <Msg kind="warn" text="IMGBB_API_KEY nahi hai — chart PDF se nikalenge par upload nahi honge, TSV me sirf file ka naam aayega." />
      )}

      <Msg text={err} />
      <Msg text={ok} kind="ok" />

      {view === "pdf" && <PdfJob api={api} onErr={setErr} onOk={flash} goJobs={() => setView("jobs")} />}
      {view === "translate" && <TranslateJob api={api} onErr={setErr} onOk={flash} goJobs={() => setView("jobs")} />}
      {view === "jobs" && <Jobs api={api} onErr={setErr} onOk={flash} />}
    </div>
  );
}

// ── PDF ────────────────────────────────────────────────────────────────────
function PdfJob({ api, onErr, onOk, goJobs }: {
  api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void; goJobs: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [book, setBook] = useState("");
  const [exam, setExam] = useState("SSC");
  const [limit, setLimit] = useState(100);
  const [diff, setDiff] = useState("auto");
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!file) return onErr("PDF choose kijiye");
    setBusy(true); onErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("book", book.trim());
      fd.append("exam_tags", exam.trim());
      fd.append("difficulty_mode", diff);
      fd.append("limit_n", String(limit));
      const res = await fetch(`${API_URL}/extractor/extract`, {
        method: "POST", headers: authHeaders(), body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || `Fail (${res.status})`);
      onOk(`Job #${d.job_id} shuru — Jobs tab me progress dikhegi`);
      setFile(null);
      goJobs();
    } catch (e: any) { onErr(e.message); }
    setBusy(false);
  }

  return (
    <div style={cardBox}>
      <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, marginBottom: 14 }}>
        Kitaab ki PDF daaliye — questions nikal kar TSV ban jayegi. Har page pehle
        yahin dekha jata hai: saaf text wale page saste model par jate hain, chart
        aur scan wale mehnge par. Isliye bill utna hi lagta hai jitna sach me zaroori ho.
        <br /><br />
        <b style={{ color: "#fff" }}>Answer kitaab ka hi rehta hai.</b> Claude se sawaal
        solve nahi karwate — jo answer key me chhapa hai wahi jata hai. Jiska answer
        na mile wo khaali rehta hai, guess nahi hota.
      </div>

      <Field label="PDF">
        <input type="file" accept=".pdf,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ ...inputStyle, padding: "9px", fontSize: 13 }} />
      </Field>

      <Field label="Kitaab ka naam" hint="TSV me reference ke liye — baad me pata rahe ki question aaya kahan se">
        <input style={inputStyle} value={book} onChange={(e) => setBook(e.target.value)}
          placeholder="Kiran SSC CGL Maths 2025" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Exam tags" hint="SSC ya SSC,Banking">
          <input style={inputStyle} value={exam} onChange={(e) => setExam(e.target.value)} />
        </Field>
        <Field label="Kitne questions" hint="Itne milte hi ruk jayega — aage ke page padhe hi nahi jayenge">
          <input style={inputStyle} type="number" min={1} max={2000} value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(2000, Number(e.target.value))))} />
        </Field>
      </div>

      <Field label="Difficulty" hint="Kitaabon me difficulty likhi nahi hoti. 'Claude tay kare' me har question apne hisaab se level paata hai.">
        <select style={inputStyle} value={diff} onChange={(e) => setDiff(e.target.value)}>
          <option value="auto">Claude tay kare</option>
          <option value="easy">Sab Easy</option>
          <option value="medium">Sab Medium</option>
          <option value="hard">Sab Hard</option>
          <option value="blank">Khaali chhodo</option>
        </select>
      </Field>

      <button onClick={start} disabled={busy || !file}
        style={{ ...goldBtn, width: "100%", opacity: busy || !file ? 0.5 : 1 }}>
        {busy ? "Upload ho raha hai…" : "Extract shuru karo"}
      </button>

      <div style={{ fontSize: 11, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>
        Pehli baar <b style={{ color: GOLD }}>20 questions</b> se test kar lijiye — output
        dekh kar hi poori kitaab par chalaiye. Kharcha har job ke saath dikhta hai.
      </div>
    </div>
  );
}

// ── TRANSLATE ──────────────────────────────────────────────────────────────
function TranslateJob({ api, onErr, onOk, goJobs }: {
  api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void; goJobs: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!file) return onErr("File choose kijiye");
    setBusy(true); onErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/extractor/translate`, {
        method: "POST", headers: authHeaders(), body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || `Fail (${res.status})`);
      onOk(`Job #${d.job_id} shuru — ${d.rows} rows`);
      setFile(null);
      goJobs();
    } catch (e: any) { onErr(e.message); }
    setBusy(false);
  }

  return (
    <div style={cardBox}>
      <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, marginBottom: 14 }}>
        Koi bhi TSV ya CSV daaliye — jiske Hindi column khaali hain wo bhar jayenge.
        <br /><br />
        <b style={{ color: "#fff" }}>Paisa bachane ke liye do engine.</b> Seedhe factual
        sawaal Google se hote hain (muft). Jis row me exam ki khaas shabdawali hai —
        “compound interest”, “fundamental rights” — wo Claude par jaati hai, kyunki
        wahan Google phisal jata hai (“मिश्रित रुचि” de deta hai, “चक्रवृद्धि ब्याज” nahi).
        <br /><br />
        Google ka jawab bina jaanche nahi liya jata: Hindi aayi ya nahi, ginti bachi ya
        nahi, lambai theek hai ya nahi. Zara bhi shaq hua to wo row Claude par chali
        jaati hai — isliye bachat hoti hai, quality nahi girti.
        <br /><br />
        <b style={{ color: "#fff" }}>English subject chhod diya jata hai.</b> Synonym,
        idiom, error detection asli paper me bhi sirf English me aate hain — inka Hindi
        banana question ko hi galat kar deta hai. Jis row me Hindi pehle se hai wo bhi
        dobara nahi hoti.
      </div>

      <Field label="TSV ya CSV" hint="Naam .csv ho par andar TSV ho — tab bhi chalega, separator content dekh kar tay hota hai">
        <input type="file" accept=".tsv,.csv,.txt,text/csv,text/tab-separated-values,text/plain"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ ...inputStyle, padding: "9px", fontSize: 13 }} />
      </Field>

      <button onClick={start} disabled={busy || !file}
        style={{ ...goldBtn, width: "100%", opacity: busy || !file ? 0.5 : 1 }}>
        {busy ? "Upload ho raha hai…" : "Translate shuru karo"}
      </button>
    </div>
  );
}

// ── JOBS ───────────────────────────────────────────────────────────────────
function Jobs({ api, onErr, onOk }: { api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const timer = useRef<any>(null);

  function load() {
    api("/extractor/jobs").then((d) => setJobs(d.jobs || [])).catch((e) => onErr(e.message));
  }

  useEffect(() => {
    load();
    // Chalti hui job ho to hi poll karte hain — warna har 3 second bekaar
    // ki request jaati rahegi
    timer.current = setInterval(() => {
      setJobs((cur) => {
        if (cur.some((j) => j.status === "running" || j.status === "queued")) load();
        return cur;
      });
    }, 3000);
    return () => clearInterval(timer.current);
  }, []);

  async function download(id: number, kind: string) {
    try {
      const res = await fetch(`${API_URL}/extractor/jobs/${id}/download`, { headers: authHeaders() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Download fail (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `job${id}_${kind}.tsv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e: any) { onErr(e.message); }
  }

  async function act(id: number, what: "cancel" | "delete") {
    if (what === "delete" && !confirm("Ye job aur uski TSV hat jayegi. Pakka?")) return;
    try {
      if (what === "cancel") await api(`/extractor/jobs/${id}/cancel`, "POST", {});
      else await api(`/extractor/jobs/${id}`, "DELETE");
      load();
    } catch (e: any) { onErr(e.message); }
  }

  if (!jobs.length) {
    return <div style={{ ...cardBox, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
      Abhi koi job nahi. PDF ya TSV daal kar shuru kijiye.
    </div>;
  }

  return (
    <div>
      {jobs.map((j) => {
        const pct = j.total_units ? Math.round(100 * (j.done_units || 0) / j.total_units) : 0;
        const live = j.status === "running" || j.status === "queued";
        const color = j.status === "done" ? GREEN : j.status === "failed" ? RED : live ? GOLD : MUTED;
        const rep = j.report || {};

        return (
          <div key={j.id} style={cardBox}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {j.kind === "extract" ? "📕" : "🔤"} {j.book || j.filename || `Job #${j.id}`}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                  #{j.id} · <span style={{ color }}>{j.status}</span>
                  {j.cost_usd ? ` · $${Number(j.cost_usd).toFixed(2)}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {j.status === "done" && (
                  <button onClick={() => download(j.id, j.kind)} style={{ ...goldBtn, padding: "8px 12px", fontSize: 12.5 }}>
                    ⬇ TSV
                  </button>
                )}
                {live && (
                  <button onClick={() => act(j.id, "cancel")} style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12 }}>
                    Cancel
                  </button>
                )}
                {!live && (
                  <button onClick={() => act(j.id, "delete")}
                    style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12, color: RED, borderColor: "rgba(255,107,107,0.4)" }}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            {j.stage && (
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>{j.stage}</div>
            )}

            {live && (
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, height: 6, marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: GOLD, transition: "width .4s" }} />
              </div>
            )}

            {j.error && (
              <div style={{ fontSize: 11.5, color: RED, marginTop: 8, lineHeight: 1.5 }}>{j.error}</div>
            )}

            {j.status === "done" && (
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 9, lineHeight: 1.7 }}>
                {j.kind === "extract" ? (
                  <>
                    <b style={{ color: "#fff" }}>{rep.questions}</b> questions ·{" "}
                    {rep.pages_read}/{rep.pages_total} pages padhe
                    <br />
                    answer: {rep.answer_exact} pakka, {rep.answer_loose} number se
                    {rep.answer_missing ? (
                      <span style={{ color: GOLD }}>, {rep.answer_missing} khaali — inhe khud bharna hoga</span>
                    ) : null}
                    <br />
                    {rep.no_explanation ? `${rep.no_explanation} bina explanation · ` : ""}
                    {rep.with_image ? `${rep.with_image} me chart · ` : ""}
                    {(rep.topics || []).length} topics
                    {!rep.key_pages && (
                      <div style={{ color: GOLD, marginTop: 4 }}>
                        Is PDF me answer key ka page nahi mila — isliye answers khaali hain.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <b style={{ color: "#fff" }}>{rep.translated}</b> rows ka Hindi bana
                    {(rep.by_google || rep.by_claude) ? (
                      <>
                        <br />
                        <span style={{ color: GREEN }}>{rep.by_google || 0} Google se (muft)</span>
                        {" · "}
                        <span style={{ color: GOLD }}>{rep.by_claude || 0} Claude se</span>
                      </>
                    ) : null}
                    {rep.google_blocked ? (
                      <div style={{ color: GOLD, marginTop: 4 }}>
                        Google ne beech me rok diya — baaki rows Claude par chali gayi.
                      </div>
                    ) : null}
                    <br />
                    {rep.english_skipped ? `${rep.english_skipped} English subject chhode · ` : ""}
                    {rep.already_hindi ? `${rep.already_hindi} me Hindi pehle se thi · ` : ""}
                    {rep.failed ? <span style={{ color: GOLD }}>{rep.failed} reh gaye — file dobara daal dijiye</span> : "sab ho gaye"}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
