"use client";

/**
 * app/worksheet-test/[id]/page.tsx — chhape hue page se poori sheet banana.
 *
 * Excel test ka doosra roop, purane formula-wale test ke saath-saath.
 *
 * SHEET SIRF PDF ME MILTI HAI, SCREEN PAR NAHI — jaan-boojh kar. Asli exam
 * me kagaz saamne rakh kar screen par type karna padta hai, aur wahi asli
 * mushkil hai. Screen par saath dikha dete to abhyas aasan ho jata aur exam
 * me wo aadat kaam na aati. Isi wajah se sheet ka content backend response
 * me bhi nahi aata — network tab kholkar bhi nahi padha ja sakta.
 */

import { useEffect, useRef, useState, useCallback, type ReactNode, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { SheetEditor, toGridData, type SheetValue } from "@/app/components/SheetEditor";

const GOLD = "#FFAB00";
const GREEN = "#1c7a3e";
const RED = "#c0392b";

type Stage = "loading" | "brief" | "work" | "result";

export default function WorksheetTest() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);

  const [stage, setStage] = useState<Stage>("loading");
  const [test, setTest] = useState<any>(null);
  const [sheet, setSheet] = useState<SheetValue>({ cells: {}, bold: [], merges: [] });
  const [computed, setComputed] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hindi, setHindi] = useState(true);
  const [submitted, setSubmitted] = useState<{ grid: string; bold: string[]; merges: string[] } | null>(null);
  const [printing, setPrinting] = useState(false);

  const startedAt = useRef(0);
  const ref = useRef({ sheet });
  ref.current = { sheet };
  const uid = (getUser() as any)?.id;

  useEffect(() => {
    if (!getUser()) { router.replace("/login"); return; }
    fetch(`${API_URL}/tier2/excel/worksheet/${testId}?user_id=${uid}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not open this test");
        setTest(d.test);
        setTimeLeft((d.test?.duration_min || 10) * 60);
        setStage("brief");
      })
      .catch((e) => { setError(e.message); setStage("result"); });
  }, [testId, uid, router]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const s = ref.current.sheet;
    try {
      const r = await fetch(`${API_URL}/tier2/excel/worksheet/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: uid, test_id: testId,
          grid_data: toGridData(s.cells),
          bold_cells: s.bold, merges: s.merges,
          seconds_taken: Math.round((Date.now() - startedAt.current) / 1000),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not submit");
      setResult(d); setStage("result");
      // Submit ke baad grid state chhoo nahi rahe, par printout usi se
      // banega — isliye alag rakh lete hain.
      setSubmitted({ grid: toGridData(s.cells), bold: s.bold, merges: s.merges });
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }, [busy, uid, testId]);

  useEffect(() => {
    if (stage !== "work") return;
    const t = setInterval(() => {
      setTimeLeft((s) => { if (s <= 1) { clearInterval(t); submit(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [stage, submit]);

  // Formula ka jawab backend se — wahi engine jo jaanch karta hai, taaki
  // jo dikhe aur jis par marks mile dono ek hi hisaab se nikle.
  useEffect(() => {
    if (stage !== "work") return;
    const has = Object.values(sheet.cells).some((v) => (v || "").startsWith("="));
    if (!has) { setComputed({}); return; }
    const t = setTimeout(() => {
      fetch(`${API_URL}/tier2/excel/worksheet/preview`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid_data: toGridData(sheet.cells) }),
      })
        .then((r) => r.json())
        .then((d) => setComputed(d?.cells || {}))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [sheet.cells, stage]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  if (stage === "loading") return <Shell><p style={{ color: "var(--muted)" }}>Loading…</p></Shell>;

  // ═══════════ BRIEF — PDF lo, phir shuru karo ═══════════
  if (stage === "brief") {
    return (
      <Shell>
        <h2 style={{ fontSize: 19, fontWeight: 900, margin: "0 0 4px" }}>{test?.title}</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
          {test?.duration_min} min · {test?.total_marks} marks · qualify {test?.pass_marks}
        </p>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)",
                      borderRadius: 12, padding: 14, marginBottom: 14, lineHeight: 1.8, fontSize: 13.5 }}>
          <b>Kaise dena hai</b>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            1. Neeche se PDF download karke <b style={{ color: "var(--text)" }}>print kar lijiye</b>.
            Asli exam me yahi kagaz haath me milta hai.<br />
            2. Kagaz saamne rakhiye. Sheet screen par nahi dikhegi — dekh kar hi type karna hai.<br />
            3. Table <b style={{ color: "var(--text)" }}>{test?.start_cell}</b> se shuru kijiye.
            {test?.start_strict ? " Galat jagah se shuru hui to asli exam me printout invalid ho jata hai." : ""}<br />
            4. Jahan bold chhapa hai wahan bold lagaiye{test?.has_merge ? ", aur title merge kijiye" : ""}.<br />
            5. Jo column khaali hain unme <b style={{ color: "var(--text)" }}>formula</b> lagaiye —
            haath se jawab likhne par marks nahi milte.
          </div>
        </div>

        <a href={`${API_URL}/tier2/excel/worksheet/pdf/${testId}?user_id=${uid}`}
           style={{ display: "block", textAlign: "center", background: "var(--card)",
                    border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 10,
                    padding: "13px 0", fontWeight: 800, fontSize: 14,
                    textDecoration: "none", marginBottom: 12 }}>
          📄 Question paper (PDF) download kijiye
        </a>

        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>
          Timer tabhi shuru hoga jab aap neeche wala button dabayenge — pehle aaram se
          PDF print kar lijiye.
        </p>

        <button onClick={() => { startedAt.current = Date.now(); setStage("work"); }}
                style={gold}>Start — timer shuru</button>
      </Shell>
    );
  }

  // ═══════════ WORK ═══════════
  if (stage === "work") {
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)",
                      border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px",
                      marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>
            Table {test?.start_cell} se
          </span>
          <span style={{ flex: 1 }} />
          <a href={`${API_URL}/tier2/excel/worksheet/pdf/${testId}?user_id=${uid}`}
             style={{ fontSize: 12, color: GOLD, textDecoration: "none", fontWeight: 700 }}>
            PDF
          </a>
          <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                         color: timeLeft <= 60 ? RED : "var(--text)" }}>{mm}:{ss}</span>
        </div>

        <SheetEditor rows={18} cols={10} value={sheet} onChange={setSheet} computed={computed} />

        <button onClick={submit} disabled={busy} style={{ ...gold, marginTop: 14 }}>
          {busy ? "Submitting…" : "Submit"}
        </button>
        {error ? <p style={{ color: RED, fontSize: 13, marginTop: 10 }}>{error}</p> : null}
      </Shell>
    );
  }

  // ═══════════ RESULT ═══════════
  if (error && !result) return <Shell><p style={{ color: RED, fontSize: 14 }}>{error}</p></Shell>;
  if (!result) return <Shell><p style={{ color: "var(--muted)" }}>Loading…</p></Shell>;

  const lostToStart = result.start_strict && !result.start_ok && result.would_be > 0;

  return (
    <Shell>
      <div style={{ background: result.qualified ? "rgba(28,122,62,0.12)" : "rgba(192,57,43,0.1)",
                    border: `1px solid ${result.qualified ? GREEN : RED}`, borderRadius: 16,
                    padding: 18, textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 32 }}>{result.qualified ? "✅" : "📈"}</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4,
                      color: result.qualified ? GREEN : RED }}>
          {result.score} / {result.total}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Qualify ke liye {result.pass_marks} chahiye the
        </div>
      </div>

      {/* Ek galti, ek jagah. Poori sheet galat nahi thi — bas shuruaat. */}
      {lostToStart && (
        <div style={{ background: "rgba(192,57,43,0.08)", border: `1px solid ${RED}`,
                      borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13.5, lineHeight: 1.75 }}>
          <b style={{ color: RED }}>Table galat cell se shuru hui</b>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            Shuru honi chahiye thi <b style={{ color: "var(--text)" }}>{result.start_cell}</b> se,
            aapki <b style={{ color: "var(--text)" }}>{result.start_found}</b> se hui.
            Asli exam me aisa printout invalid maana jata hai, isliye score 0 hai.
            <br />
            <span style={{ color: GREEN }}>
              Baaki kaam par aapke <b>{result.would_be} marks</b> ban rahe the — galti sirf
              yahi ek thi.
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    margin: "0 0 10px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Instruction ke hisaab se</h3>
        <button onClick={() => setHindi(!hindi)}
                style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 8,
                         padding: "3px 9px", fontSize: 11.5, fontWeight: 700,
                         color: "var(--text)", cursor: "pointer" }}>
          {hindi ? "EN" : "हि"}
        </button>
      </div>

      {(result.questions || []).map((q: any, i: number) => {
        const full = q.got_marks >= q.marks;
        const none = q.got_marks <= 0;
        return (
          <div key={i} style={{ background: "var(--card)", border: "1px solid var(--line)",
                                borderLeft: `3px solid ${full ? GREEN : none ? RED : GOLD}`,
                                borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, flex: 1, lineHeight: 1.5 }}>
                {hindi ? (q.label_hi || q.label_en) : q.label_en}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 800,
                             color: full ? GREEN : none ? RED : GOLD }}>
                {q.got_marks} / {q.marks}
              </span>
            </div>

            {(q.wrong?.length > 0 || q.format?.length > 0) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)",
                            fontSize: 12, fontFamily: "Consolas, monospace", lineHeight: 1.8 }}>
                {q.wrong.slice(0, 8).map((d: any) => (
                  <div key={d.ref} style={{ color: "var(--muted)" }}>
                    <b style={{ color: RED }}>{d.ref}</b>{" "}
                    {d.op === "missing" ? "khaali chhod diya"
                      : d.op === "no_formula" ? <>haath se <b>{d.got}</b> likha — formula chahiye tha</>
                      : d.op === "caps" ? <>chhote-bade akshar ka farak — <b>{d.got}</b></>
                      : d.op === "extra" ? <>yahan kuch hona hi nahi chahiye tha</>
                      : d.op === "depends" ? (
                        // Formula theek hai, dikkat kisi aur cell me hai. Ye
                        // batana zaroori hai, warna student sahi formula ko
                        // baar-baar badalta rahega.
                        <>formula <b style={{ color: GREEN }}>sahi</b> hai, par jis cell par tika
                          hai wo galat bhara hai — <b>{d.got}</b> aaya, chahiye tha{" "}
                          <b style={{ color: GREEN }}>{d.want}</b></>
                      ) : (
                        <>
                          {d.typed ? <>aapne <b>{d.typed}</b> likha, </> : null}
                          <b>{d.got}</b> aaya, chahiye tha <b style={{ color: GREEN }}>{d.want}</b>
                        </>
                      )}
                  </div>
                ))}
                {q.wrong.length > 8 && (
                  <div style={{ color: "var(--muted)" }}>…aur {q.wrong.length - 8} cell</div>
                )}
                {q.format.map((d: any) => (
                  <div key={d.ref + d.op} style={{ color: "var(--muted)" }}>
                    <b style={{ color: RED }}>{d.ref}</b>{" "}
                    {d.op === "bold_missing" ? "bold nahi kiya"
                      : d.op === "bold_extra" ? "yahan bold nahi chahiye tha"
                      : d.op === "merge_missing" ? "merge nahi kiya"
                      : "yahan merge nahi chahiye tha"}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {result.extra_cells?.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          Sheet me kuch aur bhi bhara hua tha jo page par nahi hai:{" "}
          <span style={{ fontFamily: "Consolas, monospace" }}>
            {result.extra_cells.slice(0, 10).join(", ")}
          </span>
        </p>
      )}

      {/* Asli exam me kaam khatam karke printout nikalna hota hai aur wahi
          jaancha jata hai. Isliye student apna printout nikaal kar question
          paper ke saath rakh kar khud milaa sake — wahi aadat kaam aati hai. */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
                    padding: 13, marginTop: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>Apna printout nikaliye</div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.7 }}>
          Ise question paper ke saath rakh kar milaiye — asli exam me printout hi jaancha jata hai.
        </p>
        <button
          onClick={async () => {
            if (!submitted || printing) return;
            setPrinting(true);
            try {
              const r = await fetch(`${API_URL}/tier2/excel/worksheet/answer-pdf`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: uid, test_id: testId,
                  grid_data: submitted.grid, bold_cells: submitted.bold, merges: submitted.merges,
                }),
              });
              if (!r.ok) throw new Error("PDF nahi ban payi");
              const blob = await r.blob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `My-answer-${testId}.pdf`;
              a.click();
              URL.revokeObjectURL(a.href);
            } catch { alert("PDF nahi ban payi — dobara koshish kijiye."); }
            setPrinting(false);
          }}
          disabled={!submitted || printing}
          style={{ ...ghost, width: "100%", borderColor: GOLD, color: GOLD }}
        >
          {printing ? "Ban rahi hai…" : "📄 My answer (PDF)"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => window.location.reload()} style={gold}>Try again</button>
        <button onClick={() => router.push("/tier2/excel")} style={ghost}>All tests</button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "16px 14px 40px" }}>{children}</main>
    </div>
  );
}

const gold: CSSProperties = {
  flex: 1, width: "100%", background: GOLD, color: "#1a1a1a", border: "none",
  borderRadius: 10, padding: "13px 0", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghost: CSSProperties = {
  flex: 1, background: "transparent", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 10, padding: "13px 0", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
