"use client";

/**
 * app/office-practice/page.tsx — NBEMS Word / PowerPoint practice ki list.
 * Word aur PowerPoint ka pehla task free; baaki NBEMS series kharidne par
 * (lib/officeAccess.ts). Tasks lib/officeTasks.ts me hain.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WORD_TASKS, PPT_TASKS, type Task } from "@/lib/officeTasks";
import { useOfficeAccess, isFreeOfficeTask } from "@/lib/officeAccess";

const GOLD = "#FFAB00";

export default function OfficePracticeHome() {
  const router = useRouter();
  // ?s=<series id> — Tier 2 ki NBEMS series se aaye to Excel bhi isi section me.
  // (useSearchParams nahi — Next me uske liye Suspense chahiye; yahi kaafi hai)
  const [sid, setSid] = useState<string>("");
  useEffect(() => { setSid(new URLSearchParams(window.location.search).get("s") || ""); }, []);
  const qs = sid ? `?s=${encodeURIComponent(sid)}` : "";
  const access = useOfficeAccess();
  const card = (t: Task<any>, i: number) => {
    const open = access.canOpen(t.id);
    return (
    <button key={t.id} type="button" onClick={() => router.push(open ? `/office-practice/${t.id}${qs}` : access.unlockHref())}
      style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 8, padding: "12px 14px", borderRadius: 12,
               border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", display: "flex", gap: 12, alignItems: "center" }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,171,0,0.14)", color: GOLD, fontWeight: 800,
                     display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{t.title}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          About {t.minutes} min · {t.checks.length} checks · {t.checks.reduce((a, c) => a + c.marks, 0)} marks
          {isFreeOfficeTask(t.id) && !access.owned ? <b style={{ color: "#2e8b4a" }}> · FREE</b> : null}
        </span>
      </span>
      {open
        ? <span style={{ color: GOLD, fontWeight: 800 }}>→</span>
        : <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 9px" }}>🔒 Unlock</span>}
    </button>
    );
  };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 14px 40px", color: "var(--text)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button onClick={() => router.back()} aria-label="Back"
          style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text)" }}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{sid ? "Computer skills: Excel, Word & PowerPoint" : "MS Word & PowerPoint practice"}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>NBEMS Junior Assistant skill test pattern{access.owned ? "" : " · first Word and PowerPoint task free"}</div>
        </div>
      </div>
      <div role="note" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 13px", fontSize: 12.5, lineHeight: 1.65,
                                color: "var(--muted)", background: "var(--card)", marginBottom: 16 }}>
        <b style={{ color: "var(--text)" }}>Practice only.</b> These editors work like MS Word and PowerPoint so that you can
        practise the tasks on any phone or computer. They are not the exact software you will get in the exam, so also practise
        on a real computer if you can. The tasks follow the NBEMS pattern; they are not official questions.
      </div>
      {sid && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>📊 MS Excel</h2>
          <button type="button" onClick={() => router.push(`/tier2/excel${qs}`)}
            style={{ width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 18, padding: "12px 14px", borderRadius: 12,
                     border: `1.5px solid ${GOLD}`, background: "var(--card)", color: "var(--text)", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>📊</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>Excel practice, worksheets and mock tests</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Data entry, SUM / AVERAGE, borders and formatting — checked instantly
              </span>
            </span>
            <span style={{ color: GOLD, fontWeight: 800 }}>→</span>
          </button>
        </>
      )}
      <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>📝 MS Word</h2>
      {WORD_TASKS.map(card)}
      <h2 style={{ fontSize: 15, fontWeight: 800, margin: "18px 0 8px" }}>📽️ MS PowerPoint</h2>
      {PPT_TASKS.map(card)}
    </div>
  );
}
