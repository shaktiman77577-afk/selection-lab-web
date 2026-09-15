"use client";

/**
 * ScoreCheckerAdmin.tsx — admin: score checker ka data aur settings.
 *
 * app/admin/page.tsx me "scorechecker" tab ke roop me judta hai.
 * Base: /score-checker-admin
 *
 * DO ALAG DELETE BUTTON KYUN HAIN:
 * Answer key is poore system ki sabse keemti cheez hai. digialm ke link
 * objection window ke baad marr jaate hain — uske baad us shift ki key sirf
 * apne database me bachti hai. Isliye "submissions delete" alag hai (key
 * bachi rehti hai) aur "poora exam delete" alag (key bhi jaati hai).
 * Dusre wale par delete se pehle backup CSV apne aap download hota hai.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { API_URL } from "@/lib/config";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const LINE = "rgba(255,255,255,0.1)";
const MUTED = "#9a917f";
const RED = "#E05555";
const GREEN = "#2E9E6B";
const TOKEN_KEY = "sl_admin_token";

const inputStyle: CSSProperties = {
  width: "100%", padding: "10px", borderRadius: 10,
  background: "rgba(255,255,255,0.07)", color: "#fff",
  border: `1px solid ${LINE}`, fontSize: 14, outline: "none",
};

const btn: CSSProperties = {
  padding: "9px 13px", borderRadius: 10, fontSize: 13, fontWeight: 700,
  cursor: "pointer", border: `1px solid ${LINE}`,
  background: "rgba(255,255,255,0.07)", color: "#fff",
};

export default function ScoreCheckerAdmin({ api }: { api: ApiFn }) {
  const [exams, setExams] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    try {
      const d = await api("/score-checker-admin/exams");
      setExams(d.exams || []);
      setErr("");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
    // Shift list alag try me — fail ho to exam list to dikhe
    try {
      const sh = await api("/score-checker-admin/shifts");
      setShifts(sh.shifts || []);
    } catch {
      /* chup rehna */
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      {/* Banner sabse upar hai, "Exams" ke neeche nahi. Pehle objection tool ka
          error Exams heading ke neeche dikhta tha, jisse lagta tha ki exam list
          fail hui hai — jabki galti kahin aur thi. */}
      {msg && <Banner tone="ok" text={msg} onClose={() => setMsg("")} />}
      {err && <Banner tone="bad" text={err} onClose={() => setErr("")} />}

      <ObjectionTool onDone={(m) => { setMsg(m); load(); }} onError={setErr} />

      <CoveredShifts shifts={shifts} />

      <h3 style={{ fontSize: 15, fontWeight: 800, margin: "22px 0 10px" }}>Exams</h3>

      {loading && <p style={{ color: MUTED, fontSize: 13 }}>Loading...</p>}
      {!loading && exams.length === 0 && (
        <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6 }}>
          No exams yet. An exam is created automatically the first time someone
          submits a response sheet, or when you fetch an objection PDF above.
        </p>
      )}

      {exams.map((e) => (
        <ExamCard key={e.id} exam={e} api={api} onChange={load} onMsg={setMsg} onErr={setErr} />
      ))}
    </div>
  );
}

// ── Objection PDF ───────────────────────────────────────────────────────────
function ObjectionTool({
  onDone,
  onError,
}: {
  onDone: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [saveKey, setSaveKey] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dupe, setDupe] = useState<any>(null);

  async function fetchPdf(force = false) {
    if (!url.trim()) return onError("Paste a response sheet link first.");
    setBusy(true);
    if (!force) setDupe(null);
    try {
      // api() helper JSON parse karta hai, aur yahan PDF aati hai — isliye
      // seedha fetch. Token wahi localStorage wala.
      const res = await fetch(`${API_URL}/score-checker-admin/objection-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}`,
        },
        body: JSON.stringify({ url: url.trim(), save_key: saveKey, force }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        // 409 = ye shift pehle nikal chuki hai. Rokna nahi hai, sirf batana
        // hai — kabhi dobara chahiye bhi hota hai.
        if (res.status === 409 && d.detail?.code === "already_downloaded") {
          setDupe(d.detail);
          return;
        }
        throw new Error(
          typeof d.detail === "string" ? d.detail : d.detail?.message || `Failed (${res.status})`
        );
      }

      const count = res.headers.get("X-Question-Count") || "?";
      const missing = Number(res.headers.get("X-English-Missing") || 0);
      const keys = Number(res.headers.get("X-Keys-Saved") || 0);

      await downloadBlob(await res.blob(), filenameFrom(res, "objection.pdf"));

      let note = `PDF ready — ${count} questions.`;
      if (keys) note += ` Answer key saved for ${keys} questions.`;
      if (missing) note += ` English text was missing in ${missing} question(s) — check those manually.`;
      onDone(note);
      setUrl("");
      setDupe(null);
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 4px" }}>Objection paper PDF</h3>
      <p style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.6, margin: "0 0 12px" }}>
        Paste any one candidate&apos;s response sheet link from a shift. You get the
        whole paper for that shift in English, with the official answer marked.
        No candidate details go into the PDF.
      </p>

      <input
        style={inputStyle}
        placeholder="https://cdn3.digialm.com/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "11px 0", fontSize: 12.5, cursor: "pointer" }}>
        <input type="checkbox" checked={saveKey} onChange={(e) => setSaveKey(e.target.checked)} />
        <span>
          Also save this shift&apos;s answer key
          <span style={{ color: MUTED }}> — do this while the links still work</span>
        </span>
      </label>

      <button
        onClick={() => fetchPdf(false)}
        disabled={busy}
        style={{ ...btn, background: busy ? "rgba(255,255,255,0.07)" : GOLD, color: busy ? MUTED : "#1a1408", borderColor: busy ? LINE : GOLD, fontWeight: 800 }}
      >
        {busy ? "Fetching..." : "Fetch paper & download PDF"}
      </button>

      {dupe && (
        <div
          style={{
            marginTop: 12, padding: 12, borderRadius: 10,
            border: `1px solid ${GOLD}`, background: "rgba(255,171,0,0.08)",
            fontSize: 12.5, lineHeight: 1.6,
          }}
        >
          <b style={{ color: GOLD }}>Already downloaded this shift paper.</b>
          <div style={{ marginTop: 5, color: MUTED }}>
            {dupe.exam_date} · {dupe.shift_time} — {dupe.questions} questions,
            downloaded {dupe.downloads}x
            {dupe.last_download && `, last on ${new Date(dupe.last_download).toLocaleString()}`}
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
            <button onClick={() => fetchPdf(true)} disabled={busy} style={{ ...btn, borderColor: GOLD, color: GOLD }}>
              {busy ? "..." : "Download anyway"}
            </button>
            <button onClick={() => { setDupe(null); setUrl(""); }} style={btn}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Covered shifts ──────────────────────────────────────────────────────────
function CoveredShifts({ shifts }: { shifts: any[] }) {
  const [open, setOpen] = useState(true);
  if (!shifts.length) return null;

  const done = shifts.filter((s) => s.downloads > 0).length;

  return (
    <div style={{ marginTop: 14 }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: 8 }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
          Shifts covered{" "}
          <span style={{ color: MUTED, fontWeight: 600, fontSize: 12.5 }}>
            ({done} of {shifts.length} downloaded)
          </span>
        </h3>
        <span style={{ color: MUTED, fontSize: 12 }}>{open ? "hide" : "show"}</span>
      </div>

      {open && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          {shifts.map((sh, i) => (
            <div
              key={`${sh.exam_id}-${sh.exam_date}-${sh.shift_time}`}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                gap: 10, padding: "10px 13px",
                borderTop: i === 0 ? "none" : `1px solid ${LINE}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {sh.exam_date} &nbsp;·&nbsp; {sh.shift_time}
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
                  {sh.questions} questions
                  {sh.downloads > 0 && ` · downloaded ${sh.downloads}x`}
                  {sh.last_download && ` · ${new Date(sh.last_download).toLocaleDateString()}`}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap",
                  padding: "3px 8px", borderRadius: 6,
                  color: sh.downloads > 0 ? GREEN : MUTED,
                  border: `1px solid ${sh.downloads > 0 ? GREEN : LINE}`,
                }}
              >
                {sh.downloads > 0 ? "PDF DONE" : "KEY ONLY"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ek exam ka card ─────────────────────────────────────────────────────────
function ExamCard({
  exam,
  api,
  onChange,
  onMsg,
  onErr,
}: {
  exam: any;
  api: ApiFn;
  onChange: () => void;
  onMsg: (m: string) => void;
  onErr: (m: string) => void;
  key?: any;
}) {
  const [mc, setMc] = useState(String(exam.marks_correct ?? 1));
  const [mw, setMw] = useState(String(exam.marks_wrong ?? 0.25));
  const [busy, setBusy] = useState("");
  const [confirmMode, setConfirmMode] = useState<"" | "subs" | "exam">("");
  const [typed, setTyped] = useState("");

  const name = exam.display_name || exam.assessment_name;

  async function save() {
    setBusy("save");
    try {
      await api(`/score-checker-admin/exams/${exam.id}`, "PUT", {
        marks_correct: Number(mc),
        marks_wrong: Number(mw),
        is_configured: true,
      });
      onMsg("Marking scheme saved. Run Recalculate to apply it to existing scores.");
      onChange();
    } catch (e: any) {
      onErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function recalc() {
    setBusy("recalc");
    try {
      const d = await api(`/score-checker-admin/exams/${exam.id}/recalculate`, "POST");
      onMsg(`Recalculated ${d.updated} submission(s).`);
      onChange();
    } catch (e: any) {
      onErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function exportCsv(kind: string) {
    setBusy(kind);
    try {
      await downloadCsv(exam.id, kind);
    } catch (e: any) {
      onErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function doDelete(scope: "subs" | "exam") {
    setBusy("del");
    try {
      // Poora exam delete karne se pehle backup — key wapas nahi aayegi
      if (scope === "exam") {
        onMsg("Downloading a backup before deleting...");
        await downloadCsv(exam.id, "answer_key");
        await downloadCsv(exam.id, "submissions");
      }

      const path =
        scope === "subs"
          ? `/score-checker-admin/exams/${exam.id}/submissions?confirm=${encodeURIComponent(typed)}`
          : `/score-checker-admin/exams/${exam.id}?confirm=${encodeURIComponent(typed)}`;

      const d = await api(path, "DELETE");
      onMsg(
        scope === "subs"
          ? `Deleted ${d.deleted_submissions} submission(s). Answer key kept (${d.answer_key_kept} questions).`
          : `Deleted the exam — ${d.deleted_submissions} submission(s) and ${d.deleted_answer_keys} answer key row(s).`
      );
      setConfirmMode("");
      setTyped("");
      onChange();
    } catch (e: any) {
      onErr(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>{name}</div>
        {!exam.is_configured && (
          <span style={{ fontSize: 10.5, fontWeight: 800, color: "#1a1408", background: GOLD, padding: "3px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>
            NOT SET
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "10px 0 12px", fontSize: 12, color: MUTED }}>
        <span>{exam.submission_count} submissions</span>
        <span>{exam.answer_key_count} key rows</span>
        {exam.last_submission_at && (
          <span>last {new Date(exam.last_submission_at).toLocaleDateString()}</span>
        )}
      </div>

      {/* Marking scheme */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Correct</div>
          <input style={inputStyle} value={mc} onChange={(e) => setMc(e.target.value)} inputMode="decimal" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Wrong (minus)</div>
          <input style={inputStyle} value={mw} onChange={(e) => setMw(e.target.value)} inputMode="decimal" />
        </div>
        <button onClick={save} disabled={!!busy} style={{ ...btn, background: GOLD, color: "#1a1408", borderColor: GOLD, fontWeight: 800 }}>
          {busy === "save" ? "..." : "Save"}
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <button onClick={() => exportCsv("submissions")} disabled={!!busy} style={btn}>
          {busy === "submissions" ? "..." : "Candidates CSV"}
        </button>
        <button onClick={() => exportCsv("answer_key")} disabled={!!busy} style={btn}>
          {busy === "answer_key" ? "..." : "Answer key CSV"}
        </button>
        <button onClick={() => exportCsv("responses")} disabled={!!busy} style={btn}>
          {busy === "responses" ? "..." : "Question-wise CSV"}
        </button>
        <button onClick={recalc} disabled={!!busy} style={{ ...btn, borderColor: GREEN, color: GREEN }}>
          {busy === "recalc" ? "..." : "Recalculate"}
        </button>
      </div>

      <div style={{ height: 1, background: LINE, margin: "13px 0" }} />

      {/* Delete */}
      {confirmMode === "" ? (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button onClick={() => setConfirmMode("subs")} style={{ ...btn, borderColor: RED, color: RED }}>
            Delete submissions
          </button>
          <button onClick={() => setConfirmMode("exam")} style={{ ...btn, borderColor: RED, background: "rgba(224,85,85,0.12)", color: RED }}>
            Delete entire exam
          </button>
        </div>
      ) : (
        <div style={{ border: `1px solid ${RED}`, borderRadius: 10, padding: 12, background: "rgba(224,85,85,0.07)" }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 10 }}>
            {confirmMode === "subs" ? (
              <>
                This removes all <b>{exam.submission_count}</b> candidate submissions and
                their ranks. The answer key ({exam.answer_key_count} questions) is kept.
              </>
            ) : (
              <>
                This removes the exam, all <b>{exam.submission_count}</b> submissions,
                and the answer key ({exam.answer_key_count} questions).{" "}
                <b style={{ color: RED }}>
                  The key cannot be rebuilt once the exam links expire.
                </b>{" "}
                A backup CSV will download first.
              </>
            )}
          </div>

          <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 6 }}>
            Type the exam name to confirm:
          </div>
          <div style={{ fontSize: 11.5, color: GOLD, marginBottom: 7, wordBreak: "break-word" }}>{name}</div>
          <input style={inputStyle} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Exam name" />

          <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
            <button
              onClick={() => doDelete(confirmMode)}
              disabled={typed.trim() !== name.trim() || !!busy}
              style={{
                ...btn,
                background: typed.trim() === name.trim() ? RED : "rgba(255,255,255,0.07)",
                borderColor: typed.trim() === name.trim() ? RED : LINE,
                color: typed.trim() === name.trim() ? "#fff" : MUTED,
              }}
            >
              {busy === "del" ? "Deleting..." : "Confirm delete"}
            </button>
            <button onClick={() => { setConfirmMode(""); setTyped(""); }} style={btn}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Download helpers ────────────────────────────────────────────────────────
// Admin token header me jaata hai, isliye <a download> se kaam nahi chalta.
// fetch karke blob banana padta hai.
async function downloadCsv(examId: number, kind: string) {
  const res = await fetch(
    `${API_URL}/score-checker-admin/exams/${examId}/export?kind=${kind}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` } }
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || `Export failed (${res.status})`);
  }
  await downloadBlob(await res.blob(), filenameFrom(res, `${kind}.csv`));
}

function filenameFrom(res: Response, fallback: string): string {
  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename="?([^"]+)"?/);
  return m ? m[1] : fallback;
}

async function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function Banner({ tone, text, onClose }: { tone: "ok" | "bad"; text: string; onClose: () => void }) {
  const color = tone === "ok" ? GREEN : RED;
  return (
    <div
      style={{
        border: `1px solid ${color}`, borderRadius: 10, padding: "10px 12px",
        marginBottom: 12, fontSize: 12.5, lineHeight: 1.6, color,
        background: tone === "ok" ? "rgba(46,158,107,0.08)" : "rgba(224,85,85,0.08)",
        display: "flex", justifyContent: "space-between", gap: 10,
      }}
    >
      <span>{text}</span>
      <span onClick={onClose} style={{ cursor: "pointer", fontWeight: 800 }}>×</span>
    </div>
  );
}
