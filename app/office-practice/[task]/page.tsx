"use client";

/**
 * app/office-practice/[task]/page.tsx — ek Word / PowerPoint task.
 * Upar kaam kya karna hai, beech me simulator, neeche "Check my work" —
 * har check ka ✅ / ❌ aur galat par kya karna tha (fix).
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ALL_TASKS, grade } from "@/lib/officeTasks";
import WordSim from "@/app/components/WordSim";              // purana (execCommand) — ?editor=old
import WordSimTiptap from "@/app/components/WordSimTiptap";  // naya (TipTap) — default
import PptSim from "@/app/components/PptSim";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";
const RED = "#c0392b";

export default function OfficeTaskPage() {
  const router = useRouter();
  const params = useParams() as { task?: string };
  const task = ALL_TASKS.find((t) => t.id === params?.task);
  const latest = useRef<any>(null);
  const [run, setRun] = useState(0);                 // "Start again" par simulator naya
  const [res, setRes] = useState<ReturnType<typeof grade> | null>(null);
  const [secs, setSecs] = useState(0);
  const resRef = useRef<HTMLDivElement | null>(null);
  // Section (?s=) saath rakho — wapas jaane par student usi section me lautey
  const [qs, setQs] = useState("");
  // ?editor=old -> purana Word editor (dono ko aamne-saamne test karne ke liye)
  const [oldEditor, setOldEditor] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get("s"); setQs(s ? `?s=${encodeURIComponent(s)}` : "");
    setOldEditor(q.get("editor") === "old");
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [run]);

  if (!task) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: 20, color: "var(--text)" }}>
        <p>This task was not found.</p>
        <button onClick={() => router.push(`/office-practice${qs}`)} style={{ padding: "8px 14px" }}>All tasks</button>
      </div>
    );
  }

  function check() {
    if (!latest.current) return;
    setRes(grade(task!, latest.current));
    setTimeout(() => resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function again() { latest.current = null; setRes(null); setSecs(0); setRun((r) => r + 1); window.scrollTo({ top: 0 }); }
  const idx = ALL_TASKS.findIndex((t) => t.id === task.id);
  const next = ALL_TASKS[idx + 1];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 12px 50px", color: "var(--text)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <button onClick={() => router.push(`/office-practice${qs}`)} aria-label="All tasks"
          style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text)" }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{task.app === "word" ? "MS Word" : "MS PowerPoint"} · about {task.minutes} min</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{task.title}</div>
        </div>
        <b style={{ fontVariantNumeric: "tabular-nums", color: secs > task.minutes * 60 ? RED : "var(--muted)" }}>
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
        </b>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 13.5, marginBottom: 6 }}>{task.intro}</div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
          {task.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>

      <div key={`${run}-${oldEditor}`}>
        {task.app === "word"
          ? (oldEditor
              ? <WordSim start={task.start ? task.start() : undefined} onChange={(d) => { latest.current = d; }} />
              : <WordSimTiptap start={task.start ? task.start() : undefined} onChange={(d) => { latest.current = d; }} />)
          : <PptSim start={task.start!()} onChange={(d) => { latest.current = d; }} />}
      </div>

      <button onClick={check}
        style={{ marginTop: 14, width: "100%", padding: 13, borderRadius: 10, border: "none", cursor: "pointer",
                 background: GOLD, color: "#1a1a1a", fontWeight: 800, fontSize: 15 }}>
        Check my work
      </button>

      {res && (
        <div ref={resRef} style={{ marginTop: 16, border: `1.5px solid ${res.score === res.total ? GREEN : "var(--line)"}`,
                                   borderRadius: 14, padding: 14, background: "var(--card)" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: res.score === res.total ? GREEN : res.score >= res.total / 2 ? GOLD : RED }}>
            {res.score} / {res.total}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
            {res.score === res.total ? "Everything is correct. Well done!" : "Fix the red items and press Check my work again."}
          </div>
          {res.rows.map((r, i) => (
            <div key={i} style={{ padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 13.5, lineHeight: 1.55 }}>
              <span style={{ color: r.ok ? GREEN : RED, fontWeight: 800 }}>{r.ok ? "✅" : "❌"}</span>{" "}
              <b>{r.label}</b> <span style={{ color: "var(--muted)", fontSize: 12 }}>({r.marks} {r.marks === 1 ? "mark" : "marks"})</span>
              {!r.ok && <div style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: 24 }}>{r.fix}</div>}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={again} style={{ flex: 1, padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "transparent",
                                              color: "var(--text)", fontWeight: 700, cursor: "pointer" }}>Start again</button>
            {next && (
              <button onClick={() => router.push(`/office-practice/${next.id}${qs}`)}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: GOLD, color: "#1a1a1a", fontWeight: 800, cursor: "pointer" }}>
                Next task →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
