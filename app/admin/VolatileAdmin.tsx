"use client";

/**
 * VolatileAdmin.tsx  --  "Need review" — jo questions samay ke saath purane
 * pad gaye.
 *
 * page.tsx me:  <VolatileAdmin api={api} />
 *
 * Teen kadam:
 *   SCAN    — bank me kaunse question volatile hain
 *   VERIFY  — unhe web search se dobara jaancho
 *   REVIEW  — admin approve kare tabhi live question badalta hai
 *
 * Teesra kadam isliye hai ki AI kabhi galat bhi hoga. Wo galti yahan rukti
 * hai, student tak nahi pahunchti.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";

const inputStyle: CSSProperties = {
  width: "100%", padding: "10px", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.4)",
  color: "#fff", fontSize: 13, boxSizing: "border-box",
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{hint}</div> : null}
    </label>
  );
}

// ===========================================================================
export default function VolatileAdmin({ api }: { api: ApiFn }) {
  const [view, setView] = useState<"review" | "scan" | "cleanup">("review");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [stats, setStats] = useState<any | null>(null);

  function loadStats() {
    api("/volatile/stats").then(setStats).catch((e) => setErr(e.message));
  }
  useEffect(loadStats, []);

  function flash(m: string) { setOk(m); setTimeout(() => setOk(""), 5000); }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {([["review", `⚠️ Need review${stats?.pending_review ? ` (${stats.pending_review})` : ""}`],
           ["scan", "🔎 Scan & Verify"], ["cleanup", "🗑️ Bulk cleanup"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setView(k as any); setErr(""); }}
            style={view === k ? { ...goldBtn, padding: "9px 14px" } : ghostBtn}>{l}</button>
        ))}
      </div>

      {stats && (
        <div style={{ ...cardBox, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5 }}>
          <span style={{ color: MUTED }}>volatile: <b style={{ color: "#fff" }}>{stats.volatile}</b></span>
          <span style={{ color: MUTED }}>review pending: <b style={{ color: stats.pending_review ? GOLD : "#fff" }}>{stats.pending_review}</b></span>
          <span style={{ color: MUTED }}>expired: <b style={{ color: stats.expired ? RED : "#fff" }}>{stats.expired}</b></span>
          {stats.expired ? (
            <div style={{ fontSize: 11, color: MUTED, width: "100%", lineHeight: 1.6 }}>
              Expired questions abhi bhi bank me hain, bas naye mock me nahi aa rahe —
              galat jawab dene se ye behtar hai. Verify karne par wapas aa jayenge.
            </div>
          ) : null}
        </div>
      )}

      <Msg text={err} />
      <Msg text={ok} kind="ok" />

      {view === "review" && <Review api={api} onErr={setErr} onOk={flash} after={loadStats} />}
      {view === "scan" && <ScanVerify api={api} onErr={setErr} onOk={flash} stats={stats} after={loadStats} />}
      {view === "cleanup" && <Cleanup api={api} onErr={setErr} onOk={flash} />}
    </div>
  );
}

// ── REVIEW ─────────────────────────────────────────────────────────────────
function Review({ api, onErr, onOk, after }: {
  api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void; after: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(0);
  const [edit, setEdit] = useState<Record<number, any>>({});

  function load() {
    api("/volatile/pending").then((d) => setItems(d.updates || [])).catch((e) => onErr(e.message));
  }
  useEffect(load, []);

  async function decide(u: any, action: "approve" | "reject") {
    setBusy(u.id); onErr("");
    try {
      const e = edit[u.id];
      await api(`/volatile/pending/${u.id}`, "POST",
        action === "approve" && e
          ? { action, question: e.question, options: e.options, answer: e.answer }
          : { action });
      setItems((cur) => cur.filter((x) => x.id !== u.id));
      after();
    } catch (er: any) { onErr(er.message); }
    setBusy(0);
  }

  if (!items.length) {
    return <div style={{ ...cardBox, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
      Kuch review karne ko nahi hai. “🔎 Scan & Verify” se jaanch chalaiye.
    </div>;
  }

  return (
    <div>
      {items.map((u) => {
        const e = edit[u.id] || {
          question: u.new_question,
          options: { ...(u.new_options || {}) },
          answer: u.new_answer,
        };
        const set = (patch: any) => setEdit({ ...edit, [u.id]: { ...e, ...patch } });
        const conf = (u.confidence || "medium").toLowerCase();

        return (
          <div key={u.id} style={cardBox}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, color: MUTED }}>
                question #{u.question_id}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: conf === "high" ? GREEN : conf === "low" ? RED : GOLD,
              }}>
                {conf} confidence
              </span>
            </div>

            {u.reason && (
              <div style={{ fontSize: 12, color: GOLD, marginBottom: 10, lineHeight: 1.6 }}>
                {u.reason}
                {u.source_url && (
                  <>
                    {" · "}
                    <a href={u.source_url} target="_blank" rel="noreferrer"
                      style={{ color: GOLD, textDecoration: "underline" }}>source</a>
                  </>
                )}
              </div>
            )}

            {/* purana */}
            <div style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)",
              borderRadius: 9, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 10.5, color: RED, fontWeight: 700, marginBottom: 5 }}>ABHI BANK ME</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{u.old_question}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 5, lineHeight: 1.6 }}>
                {["a", "b", "c", "d"].map((L) => (
                  <div key={L} style={{ color: (u.old_answer || "").toLowerCase() === L ? RED : MUTED }}>
                    ({L.toUpperCase()}) {(u.old_options || {})[L]}
                  </div>
                ))}
              </div>
            </div>

            {/* naya — edit ho sakta hai */}
            <div style={{ background: "rgba(93,217,124,0.08)", border: "1px solid rgba(93,217,124,0.25)",
              borderRadius: 9, padding: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 10.5, color: GREEN, fontWeight: 700, marginBottom: 6 }}>
                NAYA — approve se pehle sudhaar sakte ho
              </div>
              <textarea value={e.question} onChange={(ev) => set({ question: ev.target.value })}
                style={{ ...inputStyle, minHeight: 56, marginBottom: 7, lineHeight: 1.5 }} />
              {["a", "b", "c", "d"].map((L) => (
                <div key={L} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                  <button onClick={() => set({ answer: L.toUpperCase() })}
                    title="Isse sahi jawab banao"
                    style={{
                      width: 30, flexShrink: 0, borderRadius: 7, border: "none", cursor: "pointer",
                      padding: "8px 0", fontWeight: 800, fontSize: 12,
                      background: (e.answer || "").toLowerCase() === L ? GREEN : "rgba(255,255,255,0.08)",
                      color: (e.answer || "").toLowerCase() === L ? "#1a1a1a" : "#fff",
                    }}>{L.toUpperCase()}</button>
                  <input value={(e.options || {})[L] || ""}
                    onChange={(ev) => set({ options: { ...e.options, [L]: ev.target.value } })}
                    style={{ ...inputStyle, padding: "8px" }} />
                </div>
              ))}
            </div>

            <div style={{ fontSize: 10.5, color: MUTED, marginBottom: 9, lineHeight: 1.55 }}>
              Approve karne par is question ki Hindi hata di jayegi — English badal gaya
              aur Hindi purani rahi to student ko do alag cheezein dikhengi. Translate tab
              se dobara bhar jayegi.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => decide(u, "approve")} disabled={busy === u.id}
                style={{ ...goldBtn, flex: 2, opacity: busy === u.id ? 0.6 : 1 }}>
                {busy === u.id ? "…" : "✓ Approve"}
              </button>
              <button onClick={() => decide(u, "reject")} disabled={busy === u.id}
                style={{ ...ghostBtn, flex: 1, color: RED, borderColor: "rgba(255,107,107,0.4)" }}>
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── SCAN & VERIFY ──────────────────────────────────────────────────────────
function ScanVerify({ api, onErr, onOk, stats, after }: {
  api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void;
  stats: any; after: () => void;
}) {
  const [mode, setMode] = useState<"keyword" | "ai">("keyword");
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState("");
  const [auto, setAuto] = useState(false);

  useEffect(() => { setAuto(!!stats?.auto_verify?.enabled); }, [stats]);

  async function scan() {
    setBusy("scan"); onErr("");
    try {
      const d = await api("/volatile/scan", "POST", { mode });
      onOk(`Scan job #${d.job_id} chalu — PDF Extractor ke Jobs tab me progress dikhegi`);
    } catch (e: any) { onErr(e.message); }
    setBusy("");
  }

  async function verify() {
    setBusy("verify"); onErr("");
    try {
      const d = await api("/volatile/verify", "POST", { limit });
      onOk(`Verify job #${d.job_id} chalu — Jobs tab me progress dikhegi`);
    } catch (e: any) { onErr(e.message); }
    setBusy("");
  }

  async function toggleAuto(v: boolean) {
    try {
      await api("/volatile/auto", "POST", { enabled: v, max_per_run: 100 });
      setAuto(v);
      after();
    } catch (e: any) { onErr(e.message); }
  }

  return (
    <div>
      <div style={cardBox}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>1. Scan — volatile dhoondho</div>
        <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, marginBottom: 12 }}>
          Bank me se wo questions chunta hai jo samay ke saath galat ho jayenge —
          “current Governor”, “latest ranking”, “present PM”. Inhe nishaan lag jata
          hai, aur jab tak inhe jaancha na jaye, 6 mahine baad ye naye mock me aana
          band ho jate hain.
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {(["keyword", "ai"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ ...ghostBtn, flex: 1, padding: "8px 10px", fontSize: 12.5,
                ...(mode === m ? { background: GOLD, color: "#1a1a1a", border: "none" } : {}) }}>
              {m === "keyword" ? "Keyword (muft)" : "AI (sahi)"}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>
          {mode === "keyword"
            ? "“current”, “latest”, “present” jaise shabd dekh kar chunta hai. Muft hai, par kuch chhoot jayenge — jaise “Sabse bada gehu utpadak desh” jisme aisa koi shabd nahi."
            : "Har question ka matlab samajh kar chunta hai, isliye upar wale bhi pakde jate hain. Jo keyword se pehle hi pakka hai use AI par nahi bhejta, isliye 5,000 questions par lagbhag $2-3."}
        </div>

        <button onClick={scan} disabled={!!busy} style={{ ...goldBtn, width: "100%" }}>
          {busy === "scan" ? "Chalu ho raha hai…" : "Scan chalao"}
        </button>
      </div>

      <div style={cardBox}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>2. Verify — web se jaancho</div>
        <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, marginBottom: 12 }}>
          Volatile questions ko web search se dobara jaancha jata hai. Jahan badlav
          milta hai, wahan <b style={{ color: "#fff" }}>poora question naye options ke saath</b> banta
          hai — kyunki naya naam aksar purane options me hota hi nahi.
          <br /><br />
          Naya jawab seedha bank me nahi likha jata. Wo “Need review” me aata hai aur
          aapke approve karne par hi live hota hai.
        </div>

        <Field label="Ek baar me kitne" hint="Jo sabse der se na jaanche gaye hon, wo pehle. Web search wala kaam hai isliye ~$0.02-0.04 per question.">
          <input style={inputStyle} type="number" min={1} max={500} value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value))))} />
        </Field>

        <button onClick={verify} disabled={!!busy || !stats?.volatile}
          style={{ ...goldBtn, width: "100%", opacity: stats?.volatile ? 1 : 0.5 }}>
          {busy === "verify" ? "Chalu ho raha hai…" : "Verify chalao"}
        </button>
        {!stats?.volatile && (
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8 }}>
            Pehle scan chalaiye — abhi koi question volatile mark nahi hai.
          </div>
        )}
      </div>

      <div style={cardBox}>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input type="checkbox" checked={auto} onChange={(e) => toggleAuto(e.target.checked)}
            style={{ marginTop: 3 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Auto verify — mahine me 2 baar</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>
              1 aur 15 tareekh ko 100 questions apne aap jaanche jayenge. Nateeja phir
              bhi “Need review” me hi aayega — approve aapko hi karna hoga.
              <br /><br />
              <b style={{ color: GOLD }}>Dhyaan rahe:</b> Railway me apna scheduler nahi hai.
              Ye setting sirf ijazat deti hai — chalane ke liye kisi bahari cron (cron-job.org
              jaisa) se <code>/api/volatile/auto/run</code> par mahine me do baar call karwana padega.
              Bina uske ye off jaisa hi hai.
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}

// ── BULK CLEANUP ───────────────────────────────────────────────────────────
function Cleanup({ api, onErr, onOk }: { api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void }) {
  const [summary, setSummary] = useState<any | null>(null);
  const [pick, setPick] = useState<any | null>(null);
  const [hard, setHard] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/admin-extra/questions/summary").then(setSummary).catch((e) => onErr(e.message));
  }, []);

  async function remove() {
    if (!pick) return;
    setBusy(true); onErr("");
    try {
      const d = await api("/volatile/bulk-remove", "POST", {
        subject_id: pick.subject_id || null,
        topic_id: pick.topic_id || null,
        hard_delete: hard,
        confirm,
      });
      onOk(`${d.removed} questions ${d.mode === "deleted" ? "delete" : "band"} ho gaye` +
        (d.kept_in_tests ? ` · ${d.kept_in_tests} mock test me lage the, wo sirf band kiye gaye` : ""));
      setPick(null); setConfirm(""); setHard(false);
      api("/admin-extra/questions/summary").then(setSummary).catch(() => {});
    } catch (e: any) { onErr(e.message); }
    setBusy(false);
  }

  return (
    <div>
      <div style={{ ...cardBox, fontSize: 12.5, color: MUTED, lineHeight: 1.65 }}>
        Galti se chadhi hui file poori ki poori hata dijiye — subject ya topic ke
        hisaab se.
        <br /><br />
        Default me “hataana” matlab band karna (<code>is_active = false</code>) —
        question DB me rehta hai, bas kahin dikhta nahi. Galti ho jaye to wapas
        laya ja sakta hai.
        <br /><br />
        <b style={{ color: GOLD }}>Jo questions kisi mock test me lage hain</b> wo hard
        delete me bhi nahi hatte, sirf band hote hain — unhe hataane se purane students
        ke result toot jate.
      </div>

      {!summary ? (
        <div style={{ fontSize: 12.5, color: MUTED }}>Load…</div>
      ) : (
        summary.subjects.map((s: any) => (
          <div key={s.subject} style={cardBox}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.subject}</div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                  {s.questions} questions · {s.topics} topics
                </div>
              </div>
              <button
                onClick={() => { setPick({ label: s.subject, subject_id: s.subject_id, count: s.questions }); setConfirm(""); }}
                style={{ ...ghostBtn, padding: "8px 12px", fontSize: 12, color: RED,
                  borderColor: "rgba(255,107,107,0.4)", flexShrink: 0 }}>
                Hatao
              </button>
            </div>
          </div>
        ))
      )}

      {pick && (
        <div style={{ ...cardBox, borderColor: RED }}>
          <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>
            <b style={{ color: RED }}>{pick.label}</b> ke <b>{pick.count}</b> questions hatane ja rahe ho.
          </div>

          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 10, fontSize: 12.5 }}>
            <input type="checkbox" checked={hard} onChange={(e) => setHard(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              Hamesha ke liye delete karo (DB se hi hata do)
              <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                Bina tick ke sirf band honge — wapas laye ja sakte hain. Tick karne par wapas nahi aayenge.
              </div>
            </span>
          </label>

          <Field label='Pakka karne ke liye DELETE likhiye'>
            <input style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE" />
          </Field>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={remove} disabled={busy || confirm !== "DELETE"}
              style={{ ...goldBtn, flex: 1, background: RED, color: "#fff",
                opacity: busy || confirm !== "DELETE" ? 0.5 : 1 }}>
              {busy ? "…" : hard ? "Delete karo" : "Band karo"}
            </button>
            <button onClick={() => { setPick(null); setConfirm(""); }} style={{ ...ghostBtn, flex: 1 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
