"use client";

/**
 * app/typing-drill/page.tsx — 10-finger daily practice (sabke liye free).
 *
 * Har session ka text lib/drill.ts me NAYA banta hai — koi fixed passage
 * nahi. Galat key par aage nahi badhte: ungli ko sahi key ki aadat tabhi
 * padti hai. Neeche keyboard par agli key aur kaunsi ungli, dono dikhte hain.
 *
 * Session: 3 hisse — warm-up (nayi keys), words, review. Stage tabhi khulta
 * hai jab 2+ minute, 95%+ accuracy aur stage ki speed ho (backend tay karta
 * hai; login na ho to yahi niyam browser me).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import {
  STAGES, ROWS, FINGER_COLOR, FINGER_NAME, keyInfo, makeLine, partAt, PART_LABEL,
  type Part,
} from "@/lib/drill";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";
const RED = "#c0392b";
const LOCAL = "sl_drill_progress";

// Login na ho to bhi yahi niyam (backend ke DRILL_* jaise)
const RULES = { accuracy: 95, min_seconds: 120 };
const passWpm = (s: number) => (s <= 2 ? 10 : s <= 6 ? 15 : s <= 9 ? 18 : 22);

type Progress = {
  unlocked_stage: number; streak_days: number; today_minutes: number;
  best?: Record<string, { wpm: number; accuracy: number }>;
};

function readLocal(): Progress {
  try {
    const d = JSON.parse(localStorage.getItem(LOCAL) || "{}");
    return { unlocked_stage: d.unlocked_stage || 1, streak_days: d.streak_days || 0,
             today_minutes: d.today_minutes || 0, best: d.best || {} };
  } catch { return { unlocked_stage: 1, streak_days: 0, today_minutes: 0, best: {} }; }
}

export default function TypingDrillPage() {
  const router = useRouter();
  const uid = (getUser() as any)?.id as number | undefined;

  const [progress, setProgress] = useState<Progress | null>(null);
  const [stage, setStage] = useState(1);
  const [minutes, setMinutes] = useState(12);
  const [phase, setPhase] = useState<"pick" | "run" | "done">("pick");
  const [touchOnly, setTouchOnly] = useState(false);

  // chal rahe session ki cheezein
  const [line, setLine] = useState("");
  const [nextLine, setNextLine] = useState("");
  const [pos, setPos] = useState(0);
  const [flash, setFlash] = useState(false);
  const [part, setPart] = useState<Part>("warmup");
  const [elapsed, setElapsed] = useState(0);
  const good = useRef(0);
  const bad = useRef(0);
  const startedAt = useRef<number | null>(null);
  const boxRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<any>(null);
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    setTouchOnly(typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
                 && !window.matchMedia?.("(any-pointer: fine)").matches);
    (async () => {
      let p: Progress = readLocal();
      if (uid) {
        try {
          const r = await fetch(`${API_URL}/tier2/typing/drill/progress?user_id=${uid}`);
          if (r.ok) p = (await r.json()).progress || p;
        } catch {}
      }
      setProgress(p);
      setStage(Math.max(1, Math.min(STAGES.length, p.unlocked_stage || 1)));
    })();
  }, [uid]);

  const total = minutes * 60;

  function begin() {
    good.current = 0; bad.current = 0; startedAt.current = null;
    setElapsed(0); setPos(0); setPart("warmup"); setResult(null); setSaveErr("");
    setLine(makeLine(stage, "warmup"));
    setNextLine(makeLine(stage, "warmup"));
    setPhase("run");
    setTimeout(() => boxRef.current?.focus(), 60);
  }

  const finish = useCallback(async () => {
    const secs = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    const typed = good.current + bad.current;
    const wpm = secs > 0 ? Math.round(((good.current / 5) / (secs / 60)) * 10) / 10 : 0;
    const accuracy = typed ? Math.round((good.current / typed) * 1000) / 10 : 0;
    const passed = secs >= RULES.min_seconds && accuracy >= RULES.accuracy && wpm >= passWpm(stage);
    const res = { wpm, accuracy, seconds: secs, passed, stage };
    setResult(res);
    setPhase("done");
    if (secs < 20) return;                    // itna chhota session save karne layak nahi

    if (uid) {
      try {
        const r = await fetch(`${API_URL}/tier2/typing/drill/session`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: uid, stage, wpm, accuracy, seconds: secs }),
        });
        if (!r.ok) throw new Error();
        const d = await r.json();
        setResult({ ...res, passed: d.passed });
        setProgress(d.progress);
      } catch {
        setSaveErr("Your practice could not be saved. Check your internet — your result is shown below.");
      }
    } else {
      // Login nahi — progress isi browser me
      const p = readLocal();
      const today = new Date().toISOString().slice(0, 10);
      let d: any = {};
      try { d = JSON.parse(localStorage.getItem(LOCAL) || "{}"); } catch {}
      const last = d.last_day as string | undefined;
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streak = last === today ? p.streak_days : last === yest ? p.streak_days + 1 : 1;
      const np: any = {
        unlocked_stage: passed ? Math.max(p.unlocked_stage, Math.min(STAGES.length, stage + 1)) : p.unlocked_stage,
        streak_days: streak,
        today_minutes: (last === today ? p.today_minutes : 0) + Math.round(secs / 6) / 10,
        best: { ...(p.best || {}), ...(wpm > (p.best?.[stage]?.wpm ?? -1) ? { [stage]: { wpm, accuracy } } : {}) },
        last_day: today,
      };
      try { localStorage.setItem(LOCAL, JSON.stringify(np)); } catch {}
      setProgress(np);
    }
  }, [stage, uid]);

  // Ghadi — pehli key se chalti hai
  useEffect(() => {
    if (phase !== "run") return;
    const t = setInterval(() => {
      if (!startedAt.current) return;
      const e = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(e);
      setPart(partAt(e, total));
      if (e >= total) finish();
    }, 250);
    return () => clearInterval(t);
  }, [phase, total, finish]);

  function press(ch: string) {
    if (phase !== "run" || !line) return;
    if (!startedAt.current) startedAt.current = Date.now();
    const want = line[pos];
    if (ch === want) {
      good.current += 1;
      if (pos + 1 >= line.length) {
        // Line poori — agli line, aur uske baad ki nayi (ab ke hisse ke hisaab se)
        const e = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
        setLine(nextLine);
        setNextLine(makeLine(stage, partAt(e, total)));
        setPos(0);
      } else {
        setPos(pos + 1);
      }
    } else {
      // Galat key: aage nahi badhte — sahi ungli se sahi key ki aadat
      bad.current += 1;
      setFlash(true);
      setTimeout(() => setFlash(false), 180);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1) {
      e.preventDefault();
      press(e.key);
    } else if (e.key === "Enter" && pos === line.length) {
      e.preventDefault();
    }
  }
  // Phone ke keyboard par keydown me akshar nahi aata — input se pakadte hain
  function onInput(e: React.FormEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    const v = el.value;
    el.value = "";
    for (const ch of v) press(ch);
  }

  const shell = (children: React.ReactNode) => (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "14px 14px 40px", color: "var(--text)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button onClick={() => (phase === "run" ? finish() : router.back())}
                style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text)" }}
                aria-label="Back">←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>10-finger practice</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            New pattern every time · 10–15 minutes a day · Free
          </div>
        </div>
        {progress && (
          <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
            <div style={{ fontWeight: 800, color: progress.streak_days ? GOLD : "var(--muted)", fontSize: 14 }}>
              {progress.streak_days ? `Day ${progress.streak_days} 🔥` : "Start your streak"}
            </div>
            <div>Today: {progress.today_minutes || 0} min</div>
          </div>
        )}
      </div>
      {children}
    </div>
  );

  if (!progress) return shell(<p style={{ color: "var(--muted)" }}>Loading…</p>);

  // ── Stage chunna ──
  if (phase === "pick") {
    const st = STAGES.find((s) => s.id === stage)!;
    return shell(
      <>
        {touchOnly && (
          <div role="note" style={{ border: `1px solid ${GOLD}`, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>
            <b>Use a laptop or desktop keyboard.</b> 10-finger typing is learnt on a real keyboard —
            the exam is on one too. You can look around here on the phone, but practise on a computer.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 8, marginBottom: 14 }}>
          {STAGES.map((s) => {
            const locked = s.id > (progress.unlocked_stage || 1);
            const best = progress.best?.[String(s.id)];
            const on = s.id === stage;
            return (
              <button key={s.id} disabled={locked} onClick={() => setStage(s.id)}
                style={{
                  textAlign: "left", padding: "9px 11px", borderRadius: 10, cursor: locked ? "not-allowed" : "pointer",
                  border: `1.5px solid ${on ? GOLD : "var(--line)"}`, background: on ? "rgba(255,171,0,0.10)" : "var(--card)",
                  color: "var(--text)", opacity: locked ? 0.5 : 1,
                }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
                  Stage {s.id}{locked ? " · 🔒" : best ? ` · best ${best.wpm} WPM` : ""}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{s.title}</div>
              </button>
            );
          })}
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Stage {st.id}: {st.title}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>{st.note}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.65, marginTop: 8 }}>
            A wrong key does not move you forward — press the right key with the right finger.
            To open the next stage: at least 2 minutes, {RULES.accuracy}% accuracy and{" "}
            {passWpm(st.id)} WPM.
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Session:</span>
            {[10, 12, 15].map((m) => (
              <button key={m} onClick={() => setMinutes(m)}
                style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12.5,
                         border: `1.5px solid ${minutes === m ? GOLD : "var(--line)"}`,
                         background: minutes === m ? "rgba(255,171,0,0.12)" : "transparent", color: "var(--text)" }}>
                {m} min
              </button>
            ))}
          </div>
          <button onClick={begin}
            style={{ marginTop: 14, width: "100%", padding: 13, borderRadius: 10, border: "none", cursor: "pointer",
                     background: GOLD, color: "#1a1a1a", fontWeight: 800, fontSize: 15 }}>
            Start practice
          </button>
          <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
            The timer starts on your first key.
          </div>
        </div>
      </>
    );
  }

  // ── Nateeja ──
  if (phase === "done" && result) {
    const next = STAGES.find((s) => s.id === result.stage + 1);
    return shell(
      <div style={{ background: "var(--card)", border: `1.5px solid ${result.passed ? GREEN : "var(--line)"}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Stage {result.stage}</div>
        <div style={{ display: "flex", gap: 22, margin: "8px 0 12px", flexWrap: "wrap" }}>
          <Stat label="Speed" value={`${result.wpm} WPM`} ok={result.wpm >= passWpm(result.stage)} need={`${passWpm(result.stage)} needed`} />
          <Stat label="Accuracy" value={`${result.accuracy}%`} ok={result.accuracy >= RULES.accuracy} need={`${RULES.accuracy}% needed`} />
          <Stat label="Time" value={`${Math.floor(result.seconds / 60)}:${String(result.seconds % 60).padStart(2, "0")}`} ok={result.seconds >= RULES.min_seconds} need="2:00 needed" />
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>
          {result.passed
            ? (next ? <>✅ <b>Stage {next.id} ({next.title}) is now open.</b></> : <>✅ <b>You have finished every stage.</b> Keep a daily session to hold your speed.</>)
            : result.seconds < RULES.min_seconds
            ? "Practise for at least 2 minutes to count this stage."
            : result.accuracy < RULES.accuracy
            ? "Slow down a little. Accuracy first — speed comes with daily practice."
            : "Good accuracy. Keep practising this stage daily and the speed will come."}
        </div>
        {saveErr && <p style={{ color: RED, fontSize: 12.5, marginTop: 8 }}>{saveErr}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={begin} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: GOLD, color: "#1a1a1a", fontWeight: 800, cursor: "pointer" }}>
            Practise again (new pattern)
          </button>
          <button onClick={() => setPhase("pick")} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--text)", fontWeight: 700, cursor: "pointer" }}>
            All stages
          </button>
        </div>
      </div>
    );
  }

  // ── Chalta hua session ──
  const want = line[pos] ?? " ";
  const ki = keyInfo(want);
  const left = Math.max(0, total - elapsed);
  const typed = good.current + bad.current;
  const liveAcc = typed ? Math.round((good.current / typed) * 100) : 100;
  const liveWpm = elapsed > 3 ? Math.round((good.current / 5) / (elapsed / 60)) : 0;

  return shell(
    <div onClick={() => boxRef.current?.focus()}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, marginBottom: 8, flexWrap: "wrap" }}>
        <b style={{ color: GOLD }}>{PART_LABEL[part]}</b>
        <span style={{ color: "var(--muted)" }}>Stage {stage}</span>
        <span style={{ flex: 1 }} />
        <span>{liveWpm} WPM</span>
        <span style={{ color: liveAcc >= RULES.accuracy ? GREEN : RED }}>{liveAcc}%</span>
        <b style={{ fontVariantNumeric: "tabular-nums" }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b>
      </div>

      <div style={{
        background: "var(--card)", border: `1.5px solid ${flash ? RED : "var(--line)"}`, borderRadius: 12,
        padding: "16px 14px", fontFamily: "Consolas, 'Courier New', monospace", fontSize: 22, lineHeight: 1.6,
        letterSpacing: 0.5, userSelect: "none", transition: "border-color 0.1s",
      }}>
        <div aria-label="Type this line">
          {line.split("").map((c, i) => (
            <span key={i} style={{
              color: i < pos ? GREEN : i === pos ? "var(--text)" : "var(--muted)",
              background: i === pos ? (flash ? "rgba(192,57,43,0.18)" : "rgba(255,171,0,0.25)") : "transparent",
              borderBottom: i === pos ? `2px solid ${flash ? RED : GOLD}` : "2px solid transparent",
              whiteSpace: "pre",
            }}>{c}</span>
          ))}
        </div>
        <div style={{ color: "var(--muted)", opacity: 0.55, fontSize: 17, marginTop: 6 }}>{nextLine}</div>
      </div>

      <input ref={boxRef} onKeyDown={onKeyDown} onInput={onInput} autoFocus
             autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
             aria-label="Typing box" style={{ position: "absolute", opacity: 0, width: 1, height: 1, left: -9999 }} />

      <div style={{ fontSize: 13, textAlign: "center", margin: "10px 0 8px" }}>
        Next: <b style={{ fontFamily: "monospace", fontSize: 15 }}>{want === " " ? "space" : want}</b> — use your{" "}
        <b style={{ background: FINGER_COLOR[ki.finger], color: "#1a1a1a", padding: "1px 6px", borderRadius: 5 }}>{FINGER_NAME[ki.finger]}</b>
        {ki.shift ? <> and hold <b>{ki.shiftSide === "L" ? "left" : "right"} Shift</b></> : null}
      </div>

      <Keyboard target={ki.base} shiftSide={ki.shift ? ki.shiftSide : null} />

      <button onClick={finish}
        style={{ marginTop: 14, padding: "10px 16px", borderRadius: 10, border: "1px solid var(--line)",
                 background: "transparent", color: "var(--text)", fontWeight: 700, cursor: "pointer" }}>
        End session
      </button>
    </div>
  );
}

function Stat({ label, value, ok, need }: { label: string; value: string; ok: boolean; need: string }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: ok ? GREEN : RED }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{need}</div>
    </div>
  );
}

// Keyboard ki tasveer — har key apni ungli ke rang me, agli key ubhri hui
function Keyboard({ target, shiftSide }: { target: string; shiftSide: "L" | "R" | null }) {
  const indent = [0, 18, 26, 40];
  const key = (label: string, base: string, extra: any = {}) => {
    const k = keyInfo(base);
    const on = base === target;
    return (
      <div key={label + base} style={{
        minWidth: 26, height: 30, flex: extra.flex || "0 0 auto", padding: "0 4px",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 5, fontSize: 12, fontWeight: 700, fontFamily: "monospace",
        background: FINGER_COLOR[k.finger], color: "#1a1a1a",
        outline: on ? `3px solid ${GOLD}` : "none", transform: on ? "translateY(-2px)" : "none",
        boxShadow: on ? "0 3px 8px rgba(0,0,0,0.25)" : "none", opacity: on ? 1 : 0.75,
        ...extra.style,
      }}>{label}</div>
    );
  };
  const shiftKey = (side: "L" | "R") => (
    <div style={{
      minWidth: 44, height: 30, borderRadius: 5, fontSize: 11, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1a1a",
      background: FINGER_COLOR[side === "L" ? "LP" : "RP"], opacity: shiftSide === side ? 1 : 0.75,
      outline: shiftSide === side ? `3px solid ${GOLD}` : "none",
    }}>Shift</div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, minWidth: 420 }}>
        {ROWS.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: 4, paddingLeft: i === 3 ? 0 : indent[i] }}>
            {i === 3 && shiftKey("L")}
            {row.map(([b]) => key(b.toUpperCase() === b ? b : b.toUpperCase(), b))}
            {i === 3 && shiftKey("R")}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {key("space", " ", { style: { width: 200 } })}
        </div>
      </div>
    </div>
  );
}
