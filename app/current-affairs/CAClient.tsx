"use client";

// Current Affairs ka poora page (browser wala hissa) — dekho page.tsx.
//
// Ek mahine ka saara data EK baar aata hai (/ca/month/YYYY-MM), phir block,
// din, search, bhasha — sab yahin turant badalte hain, dobara server nahi jaate.
// Jo mahina ek baar khula, wo is tab me yaad rehta hai (sessionStorage) —
// wapas aao to turant. Saath me pichhla mahina peeche se pehle hi mangwa lete hain.
//
// Backend: routers/current_affairs.py (/api/ca/...). Har view/quiz/PDF wahan
// analytics me gina jaata hai (visitor = login user ya is browser ka random id).
//
// Student ko dikhne wala har shabd English me (Hinglish nahi). Free period ke
// baad plan (CAPlans.tsx) — lock box aur "plans" sheet me.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";
import { isAppMode } from "@/lib/appMode";
import CAQuiz from "./CAQuiz";
import CAPlans, { PLANS_CSS, fmtDay } from "./CAPlans";

type Card = {
  ref_no: string; ca_month: string; block: number; ca_date: string; category: string;
  stem_en: string; stem_hi: string; answer_en: string; answer_hi: string;
  detail_en?: string; detail_hi?: string; static_gk_en?: string; static_gk_hi?: string;
  day?: { day_en?: string; day_hi?: string; theme_en?: string; theme_hi?: string } | null;
  is_update?: boolean;          // purani news ka naya development (daily package me Important = U)
};
type Access = {
  open: boolean; reason: string; free: boolean; free_until?: string; pass_course_id?: number | null;
  window_from?: string | null; free_days?: number; plan?: { name?: string; expires_at?: string } | null;
};
type MonthData = { access: Access; month: string; cards: Card[]; locked: boolean; total?: number; blocks: any[] };
type Lang = "both" | "en" | "hi";
type PdfKind = "quick" | "notes" | "mcq";

const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MN_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MN_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
const BLOCK_HI: Record<number, string> = {
  1: "नियुक्तियाँ एवं निधन", 2: "पुरस्कार एवं पुस्तकें", 3: "सरकारी योजनाएँ", 4: "राजव्यवस्था एवं राष्ट्रीय",
  5: "अंतरराष्ट्रीय एवं शिखर सम्मेलन", 6: "अर्थव्यवस्था एवं रिपोर्ट", 7: "रक्षा एवं विज्ञान",
  8: "पर्यावरण एवं संस्कृति", 9: "खेल", 10: "महत्वपूर्ण दिवस",
};
const BLOCK_SHORT: Record<number, string> = {
  1: "Appointments", 2: "Awards & Books", 3: "Schemes", 4: "Polity", 5: "International", 6: "Economy",
  7: "Defence & Science", 8: "Environment", 9: "Sports", 10: "Important Days",
};
const KIND: Record<PdfKind, { icon: string; name: string; what: string }> = {
  quick: { icon: "⚡", name: "Quick Revision", what: "One-liners only" },
  notes: { icon: "📖", name: "Detailed Notes", what: "Detail + Static GK" },
  mcq: { icon: "📝", name: "MCQ Practice", what: "MCQs + full explanations" },
};

const monLabel = (m: string) => (m ? `${MN[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` : "");
const monFull = (m: string) => (m ? `${MN_FULL[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` : "");
const monHi = (m: string) => (m ? `${MN_HI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` : "");
const dayNum = (d: string) => Number(d.slice(8, 10));
const stem = (s: string) => (s || "").replace(/[\s—–-]+$/, "");

function visitorId(): string {
  try {
    let v = localStorage.getItem("sl_ca_vis");
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("sl_ca_vis", v);
    }
    return v;
  } catch {
    return "";
  }
}

function cacheGet(k: string): MonthData | null {
  try {
    const raw = sessionStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function cacheSet(k: string, v: MonthData) {
  try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* bhar gaya — koi baat nahi */ }
}

export default function CAClient({ home, initialMonth, initialData, initialBlock, initialDay }: {
  home: any; initialMonth: string; initialData: MonthData | null; initialBlock: number; initialDay: string;
}) {
  const months: { month: string; cards: number; latest: string }[] = home?.months || [];
  const blockNames: Record<string, string> = home?.blocks || {};
  const totalCards = months.reduce((a, m) => a + (m.cards || 0), 0);

  const [user, setUser] = useState<{ id: number } | null>(null);
  const [ready, setReady] = useState(false);              // browser ne user dekh liya
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState<Record<string, MonthData>>(initialData ? { [initialMonth]: initialData } : {});
  const [full, setFull] = useState<Record<string, boolean>>({});   // is mahine ka asli (user wala) data aa gaya
  const [loading, setLoading] = useState(false);
  const [block, setBlock] = useState(initialBlock);
  const [day, setDay] = useState(initialDay);
  const [lang, setLang] = useState<Lang>("both");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [quiz, setQuiz] = useState<{ scope: "day" | "block"; key: string; title: string } | null>(null);
  const [sheet, setSheet] = useState<"" | "pdf" | "quiz" | "plans">("");
  const [welcome, setWelcome] = useState("");
  const [pdfInfo, setPdfInfo] = useState<Record<string, any>>({});
  const vis = useRef("");
  const plat = useRef("web");

  const qs = useCallback((extra: Record<string, string | number | undefined> = {}) => {
    const p = new URLSearchParams();
    if (user?.id) p.set("user_id", String(user.id));
    if (vis.current) p.set("visitor", vis.current);
    p.set("platform", plat.current);
    Object.entries(extra).forEach(([k, v]) => v !== undefined && v !== "" && p.set(k, String(v)));
    return p.toString();
  }, [user]);

  // ── Pehli baar: user + visitor + bhasha ──
  useEffect(() => {
    const u = getUser();
    setUser(u && u.id ? { id: u.id } : null);
    vis.current = visitorId();
    plat.current = isAppMode() ? "app" : "web";
    try {
      const l = localStorage.getItem("sl_ca_lang") as Lang | null;
      if (l === "en" || l === "hi" || l === "both") setLang(l);
    } catch { /* */ }
    setReady(true);
  }, []);

  // ── Mahina lao (user ke hisaab se) ──
  const loadMonth = useCallback(async (m: string, quiet = false) => {
    if (!m) return;
    const ck = `ca_m_${m}_${user?.id || "anon"}`;
    const hit = cacheGet(ck);
    if (hit) {
      setData((d) => ({ ...d, [m]: hit }));
      setFull((f) => ({ ...f, [m]: true }));
    }
    if (!quiet && !hit) setLoading(true);
    try {
      const r = await fetch(`${API_URL}/ca/month/${m}?${qs()}`);
      if (r.ok) {
        const d: MonthData = await r.json();
        setData((x) => ({ ...x, [m]: d }));
        setFull((f) => ({ ...f, [m]: true }));
        cacheSet(ck, d);
      }
    } catch { /* net nahi — jo hai wahi dikhao */ }
    if (!quiet) setLoading(false);
  }, [qs, user]);

  useEffect(() => {
    if (!ready) return;
    loadMonth(month);
  }, [ready, month, loadMonth]);

  // Pichhla mahina peeche se — agla click turant
  useEffect(() => {
    if (!ready || !full[month]) return;
    const i = months.findIndex((x) => x.month === month);
    const prev = months[i + 1]?.month;
    if (prev && !data[prev]) {
      const t = setTimeout(() => {
        const ck = `ca_m_${prev}_${user?.id || "anon"}`;
        if (cacheGet(ck)) return;
        // prefetch=1: backend isse analytics me "view" nahi ginta
        fetch(`${API_URL}/ca/month/${prev}?${qs({ prefetch: 1 })}`).then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d) { cacheSet(ck, d); } }).catch(() => {});
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [ready, full, month, months, data, qs, user]);

  // URL me haal (share / reload par wahi khule)
  useEffect(() => {
    const p = new URLSearchParams();
    if (month) p.set("m", month);
    if (block) p.set("b", String(block));
    if (day) p.set("d", day);
    try { window.history.replaceState(null, "", `/current-affairs${p.toString() ? `?${p}` : ""}`); } catch { /* */ }
  }, [month, block, day]);

  const md = data[month];
  // Server wala data bina login ke bana hota hai (locked preview). Login wale
  // student ko uska apna data aane tak "login kijiye" mat dikhao — skeleton dikhao.
  const confirmed = !!full[month] || (ready && !user);
  const access: Access | undefined = confirmed ? md?.access : undefined;
  // Band hone par bhi aakhri N din khule (admin: free_days)
  const dayOk = (d: string) => !!access && (access.open || (!!access.window_from && !!d && d >= access.window_from));
  const locked = !!md?.locked && confirmed;
  const cards = md?.cards || [];
  const showSkeleton = !confirmed || (loading && !full[month]);

  // ── Din + block (mahine ke cards se) ──
  const days = useMemo(() => {
    const m: Record<string, number> = {};
    cards.forEach((c) => { const d = String(c.ca_date).slice(0, 10); m[d] = (m[d] || 0) + 1; });
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [cards]);
  const blockCounts = useMemo(() => {
    if (md?.blocks?.length) return md.blocks.map((b: any) => [Number(b.block), b.cards] as [number, number]);
    const m: Record<number, number> = {};
    cards.forEach((c) => { m[c.block] = (m[c.block] || 0) + 1; });
    return Object.entries(m).map(([b, n]) => [Number(b), n] as [number, number]).sort((a, b) => a[0] - b[0]);
  }, [md, cards]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return cards.filter((c) => (!block || c.block === block) && (!day || String(c.ca_date).startsWith(day)) &&
      (!s || `${c.stem_en} ${c.answer_en} ${c.stem_hi} ${c.answer_hi}`.toLowerCase().includes(s)));
  }, [cards, block, day, q]);

  // ── PDF: kis cheez ka (din > block > mahina) ──
  const pdfScope = day ? { scope: "day", key: day, label: `${dayNum(day)} ${MN[Number(day.slice(5, 7)) - 1]}` }
    : block ? { scope: "block", key: `${month}:${block}`, label: `${BLOCK_SHORT[block]} · ${monLabel(month)}` }
      : { scope: "month", key: month, label: monFull(month) };
  const pdfKey = `${pdfScope.scope}:${pdfScope.key}`;

  // PDF sirf poore access par — free wale aakhri din ka bhi nahi (backend bhi yahi maanta hai)
  const pdfOk = !!access && access.open;
  useEffect(() => {
    if (!ready || !month || !pdfOk) return;
    const want = [pdfKey, "all:all"];
    want.forEach((k) => {
      if (pdfInfo[k]) return;
      const [scope, ...rest] = k.split(":");
      const key = rest.join(":");
      setPdfInfo((p) => ({ ...p, [k]: { loading: true } }));
      fetch(`${API_URL}/ca/pdf/info?scope=${scope}&key=${encodeURIComponent(key)}`).then((r) => (r.ok ? r.json() : null))
        .then((d) => setPdfInfo((p) => ({ ...p, [k]: d || { enabled: false } })))
        .catch(() => setPdfInfo((p) => ({ ...p, [k]: { enabled: false } })));
    });
  }, [ready, month, pdfOk, pdfKey, pdfInfo]);

  const pdfUrl = (scope: string, key: string, kind: PdfKind) => `${API_URL}/ca/pdf?${qs({ scope, key, kind })}`;

  function track(event: string, extra: Record<string, any> = {}) {
    try {
      fetch(`${API_URL}/ca/event`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, user_id: user?.id, visitor: vis.current, platform: plat.current, ca_month: month, ...extra }),
      }).catch(() => {});
    } catch { /* */ }
  }

  function changeLang(l: Lang) {
    setLang(l);
    try { localStorage.setItem("sl_ca_lang", l); } catch { /* */ }
    track("lang", { meta: { lang: l } });
  }

  function goLogin() {
    try { sessionStorage.setItem("sl_after_login", window.location.pathname + window.location.search); } catch { /* */ }
    window.location.href = "/login";
  }

  // Plan liya — is student ka cache saaf karke mahina dobara lao (ab poora khula)
  function afterBuy(plan: string, expires?: string) {
    try {
      Object.keys(sessionStorage).filter((k) => k.startsWith("ca_m_")).forEach((k) => sessionStorage.removeItem(k));
    } catch { /* */ }
    setWelcome(`${plan || "Your plan"} is active${expires ? ` till ${fmtDay(expires)}` : ""}. Happy learning!`);
    setSheet("");
    setFull({});
    setPdfInfo({});
    loadMonth(month);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Band cheez par click: login nahi to login, warna plans
  function unlock() {
    if (!access) return;
    if (access.reason === "login") goLogin();
    else setSheet("plans");
  }

  function pickMonth(m: string) {
    setMonth(m); setBlock(0); setDay(""); setQ("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startQuiz(scope: "day" | "block", key: string, title: string) {
    setSheet("");
    if (!access) return;
    if (!access.open && !(scope === "day" && dayOk(key))) { unlock(); return; }
    // Free wala din bina login ke padh sakte hain, par quiz ke liye login
    if (!access.open && !user) { goLogin(); return; }
    setQuiz({ scope, key, title });
  }

  const quizTarget = day ? { scope: "day" as const, key: day, title: `Daily quiz — ${dayNum(day)} ${MN_FULL[Number(day.slice(5, 7)) - 1]}` }
    : block ? { scope: "block" as const, key: `${month}:${block}`, title: `${blockNames[String(block)] || BLOCK_SHORT[block]} — ${monLabel(month)}` }
      : null;

  // ═══════════════════════════════════════════════════════════════════════
  if (!months.length) {
    return (
      <main className="v2-wrap" style={{ padding: "40px 16px", minHeight: "50vh" }}>
        <h1 className="v2-h1">Current Affairs</h1>
        <p style={{ color: "var(--muted)" }}>Coming soon. Please check back in a little while.</p>
      </main>
    );
  }

  const lockBox = access && !access.open && (
    <div className="ca-lock">
      <div style={{ fontSize: 26 }}>{access.reason === "login" ? "🔓" : "🎟️"}</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          {access.reason === "login"
            ? (access.free ? `Free till ${fmtFree(access.free_until)} — just log in` : "Log in to keep reading")
            : "Unlock all Current Affairs"}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>
          {access.window_from ? (access.free_days === 1 ? "The latest day is free. " : `The latest ${access.free_days} days are free. `) : ""}
          {md?.total ? `Get all ${md.total} one-liners of this month, ` : "Get every one-liner, "}block-wise quizzes and PDFs (Quick, Detailed Notes, MCQ).
        </div>
      </div>
      {access.reason === "login"
        ? <button className="ca-btn ca-gold" onClick={goLogin}>Log in / Sign up — Free</button>
        : <CAPlans userId={user?.id} passCourseId={access.pass_course_id} onLogin={goLogin} onDone={afterBuy} />}
    </div>
  );

  return (
    <div className="ca">
      <style dangerouslySetInnerHTML={{ __html: CSS + PLANS_CSS }} />

      {/* ── Hero ── */}
      <section className="ca-hero">
        <div className="ca-hero-in">
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1>Current Affairs — {monFull(month)}</h1>
            <p className="ca-hide-m">Important one-liners for every day · English + Hindi · Block-wise quiz · PDF (Quick / Notes / MCQ)</p>
          </div>
          {(md?.access || home?.access)?.free && (
            <span className="ca-free">🎁 Free till {fmtFree((md?.access || home?.access)?.free_until)}</span>
          )}
          {access?.reason === "plan" && access.plan && (
            <span className="ca-free">✓ {access.plan.name} · till {fmtDay(access.plan.expires_at)}</span>
          )}
          <div className="ca-stats">
            <div><b>{totalCards.toLocaleString("en-IN")}</b><span>One-liners</span></div>
            <div><b>{months.length}</b><span>Months</span></div>
            <div><b>2</b><span>Languages</span></div>
          </div>
        </div>
      </section>

      <div className="ca-wrap">
        {/* ── Baayen: mahine ── */}
        <aside className="ca-side">
          <div className="ca-box">
            <div className="ca-cap">Months</div>
            {months.map((m) => (
              <button key={m.month} className={`ca-mon${m.month === month ? " on" : ""}`} onClick={() => pickMonth(m.month)}>
                <span>{monLabel(m.month)}</span><em>{m.cards}</em>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Beech: cards ── */}
        <main className="ca-main">
          <div className="ca-chips ca-mchips">
            {months.map((m) => (
              <button key={m.month} className={`ca-chip${m.month === month ? " on" : ""}`} onClick={() => pickMonth(m.month)}>{monLabel(m.month)}</button>
            ))}
          </div>

          <div className="ca-row">
            <div style={{ minWidth: 0 }}>
              <h2 className="ca-h2">{monFull(month)} <span>| {monHi(month)}</span></h2>
              <div className="ca-sub">{md?.total ?? cards.length} one-liners · {blockCounts.length} blocks
                {days[0] ? ` · last updated ${dayNum(days[0][0])} ${MN[Number(days[0][0].slice(5, 7)) - 1]}` : ""}</div>
            </div>
          </div>

          {days.length > 0 && (
            <div className="ca-days">
              <button className={`ca-day${!day ? " on" : ""}`} onClick={() => setDay("")}><b>All</b><span>days</span></button>
              {days.map(([d, n]) => (
                <button key={d} className={`ca-day${day === d ? " on" : ""}`} onClick={() => setDay(day === d ? "" : d)}>
                  <b>{dayNum(d)}</b><span>{MN[Number(d.slice(5, 7)) - 1]}</span><em>{n}</em>
                </button>
              ))}
            </div>
          )}

          <div className="ca-chips">
            <button className={`ca-chip${!block ? " on" : ""}`} onClick={() => setBlock(0)}>All · {md?.total ?? cards.length}</button>
            {blockCounts.map(([b, n]) => (
              <button key={b} className={`ca-chip${block === b ? " on" : ""}`} onClick={() => setBlock(block === b ? 0 : b)}>
                {BLOCK_SHORT[b] || blockNames[String(b)]} · {n}
              </button>
            ))}
          </div>

          <div className="ca-tools">
            <div className="ca-seg">
              {([["both", "EN + HI"], ["en", "English"], ["hi", "हिंदी"]] as [Lang, string][]).map(([k, t]) => (
                <button key={k} className={lang === k ? "on" : ""} onClick={() => changeLang(k)}>{t}</button>
              ))}
            </div>
            <input className="ca-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search — names, schemes, places…" />
          </div>

          {(block || day) ? (
            <div className="ca-bhead">
              <b>{day ? `${dayNum(day)} ${MN_FULL[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}` : `${blockNames[String(block)] || BLOCK_SHORT[block]} | ${BLOCK_HI[block] || ""}`}</b>
              <span style={{ flex: 1 }} />
              <span className="ca-sub">{shown.length} one-liners</span>
              {quizTarget && (access?.open || (quizTarget.scope === "day" && dayOk(quizTarget.key))) && (
                <button className="ca-btn ca-gold ca-hide-m" onClick={() => startQuiz(quizTarget.scope, quizTarget.key, quizTarget.title)}>▶ Quiz</button>
              )}
            </div>
          ) : null}

          {welcome && <div className="ca-welcome">🎉 {welcome}<button onClick={() => setWelcome("")} aria-label="Close">✕</button></div>}
          {locked && lockBox}

          <div className="ca-grid">
            {shown.map((c, i) => {
              const isOpen = !!open[c.ref_no];
              const hasMore = !!(c.detail_en || c.detail_hi || c.static_gk_en || c.day?.theme_en);
              return (
                <article key={c.ref_no} className="ca-card">
                  <div className="ca-ctop">
                    <span className="ca-num">{i + 1}</span>
                    <span className="ca-date">{dayNum(String(c.ca_date))} {MN[Number(String(c.ca_date).slice(5, 7)) - 1]}</span>
                    <span className="ca-cat">{BLOCK_SHORT[c.block] || c.category}</span>
                    {c.is_update && <span className="ca-upd" title="A new development in a story covered earlier">UPDATE</span>}
                  </div>
                  {lang !== "hi" && (
                    <p className="ca-en">{stem(c.stem_en)} <span className="ca-arr">→</span> <b>{c.answer_en}</b></p>
                  )}
                  {lang !== "en" && (
                    <p className={lang === "hi" ? "ca-en ca-hionly" : "ca-hi"}>{stem(c.stem_hi)} <span className="ca-arr">→</span> <b>{c.answer_hi}</b></p>
                  )}
                  {hasMore && (
                    <button className="ca-more" onClick={() => {
                      setOpen((o) => ({ ...o, [c.ref_no]: !isOpen }));
                      if (!isOpen) track("open_card", { ref_no: c.ref_no, block: c.block });
                    }}>{isOpen ? "− Hide detail" : "+ Detail & Static GK"}</button>
                  )}
                  {isOpen && (
                    <div className="ca-detail">
                      {c.day?.theme_en && <p><b>Theme:</b> {lang !== "hi" && c.day.theme_en}{lang === "both" && c.day.theme_hi ? " | " : ""}{lang !== "en" && c.day.theme_hi}</p>}
                      {lang !== "hi" && c.detail_en && <p>{c.detail_en}</p>}
                      {lang !== "en" && c.detail_hi && <p className="ca-dhi">{c.detail_hi}</p>}
                      {(c.static_gk_en || c.static_gk_hi) && (
                        <div className="ca-gk"><b>STATIC GK</b>
                          {lang !== "hi" && c.static_gk_en && <div>{c.static_gk_en}</div>}
                          {lang !== "en" && c.static_gk_hi && <div className="ca-dhi">{c.static_gk_hi}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {showSkeleton && Array.from({ length: 4 }).map((_, i) => <div key={`sk${i}`} className="ca-card ca-sk"><div /><div /><div /></div>)}
          </div>
          {!showSkeleton && !locked && shown.length === 0 && (
            <div className="ca-empty">{q ? `No results for "${q}"` : "No one-liners here yet"}</div>
          )}
          {locked && shown.length > 0 && <div style={{ marginTop: 12 }}>{lockBox}</div>}
        </main>

        {/* ── Daayen: quiz + PDF ── */}
        <aside className="ca-rail">
          <QuizBox access={access} quizTarget={quizTarget} blockCounts={blockCounts} month={month}
            blockNames={blockNames} start={startQuiz} days={days} />
          <PdfBox access={access} ok={pdfOk} info={pdfInfo} pdfKey={pdfKey} label={pdfScope.label} scope={pdfScope.scope}
            skey={pdfScope.key} url={pdfUrl} onUnlock={unlock} />
          <div className="ca-box">
            <h3>✈️ Daily updates on Telegram</h3>
            <p>Daily one-liners and the quiz link, straight to your phone.</p>
            <a className="ca-btn ca-wide" href="https://t.me/Selection_Lab" target="_blank" rel="noreferrer">Join t.me/Selection_Lab</a>
          </div>
        </aside>
      </div>

      {/* ── Mobile: neeche ki patti ── */}
      <div className="ca-bar">
        <button className="ca-btn" onClick={() => (!access || pdfOk ? setSheet("pdf") : unlock())}>⬇ PDF</button>
        <button className="ca-btn ca-gold" onClick={() => {
          if (!access) return;
          if (quizTarget) startQuiz(quizTarget.scope, quizTarget.key, quizTarget.title);
          else if (!access.open) unlock();
          else setSheet("quiz");
        }}>▶ Quiz</button>
      </div>

      {sheet && (
        <div className="ca-sheet-bg" onClick={() => setSheet("")}>
          <div className="ca-sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <b style={{ flex: 1 }}>{sheet === "pdf" ? "📄 Download PDF" : sheet === "plans" ? "🎟️ Unlock all Current Affairs" : "▶ Choose a quiz"}</b>
              <button className="ca-btn" onClick={() => setSheet("")} aria-label="Close">✕</button>
            </div>
            {sheet === "plans" ? (
              <>
                <p className="ca-pnote" style={{ marginBottom: 10, fontSize: 13 }}>Every daily one-liner, block-wise quizzes with full explanations, and all PDFs — in English + Hindi.</p>
                <CAPlans userId={user?.id} passCourseId={access?.pass_course_id} onLogin={goLogin} onDone={afterBuy} />
              </>
            ) : sheet === "pdf"
              ? <PdfBox access={access} ok={pdfOk} info={pdfInfo} pdfKey={pdfKey} label={pdfScope.label} scope={pdfScope.scope}
                skey={pdfScope.key} url={pdfUrl} onUnlock={unlock} bare />
              : <QuizBox access={access} quizTarget={null} blockCounts={blockCounts} month={month}
                blockNames={blockNames} start={startQuiz} days={days} bare />}
          </div>
        </div>
      )}

      {quiz && (
        <CAQuiz scope={quiz.scope} k={quiz.key} title={quiz.title} lang={lang} qs={qs}
          ident={{ user_id: user?.id, visitor: vis.current || undefined, platform: plat.current }} onClose={() => setQuiz(null)} />
      )}
    </div>
  );
}

function fmtFree(d?: string) {
  if (!d) return "";
  const x = String(d).slice(0, 10);
  return `${Number(x.slice(8, 10))} ${MN[Number(x.slice(5, 7)) - 1]} ${x.slice(0, 4)}`;
}

function QuizBox({ access, quizTarget, blockCounts, month, blockNames, start, days, bare }: {
  access: Access | undefined; quizTarget: { scope: "day" | "block"; key: string; title: string } | null;
  blockCounts: [number, number][]; month: string; blockNames: Record<string, string>; days: [string, number][];
  start: (scope: "day" | "block", key: string, title: string) => void; bare?: boolean;
}) {
  const body = (
    <>
      {quizTarget && (
        <button className="ca-btn ca-gold ca-wide" style={{ marginBottom: 10 }}
          onClick={() => start(quizTarget.scope, quizTarget.key, quizTarget.title)}>▶ Start: {quizTarget.title}</button>
      )}
      <div className="ca-cap" style={{ margin: "4px 0 6px" }}>Block-wise quiz · {monLabel(month)}</div>
      {blockCounts.map(([b]) => (
        <button key={b} className="ca-qrow" onClick={() => start("block", `${month}:${b}`, `${blockNames[String(b)] || BLOCK_SHORT[b]} — ${monLabel(month)}`)}>
          <span>{BLOCK_SHORT[b] || blockNames[String(b)]}</span><em>▶</em>
        </button>
      ))}
      {days.length > 0 && (
        <>
          <div className="ca-cap" style={{ margin: "10px 0 6px" }}>Daily quiz</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {days.slice(0, 10).map(([d]) => (
              <button key={d} className="ca-chip" onClick={() => start("day", d, `Daily quiz — ${dayNum(d)} ${MN_FULL[Number(d.slice(5, 7)) - 1]}`)}>
                {dayNum(d)} {MN[Number(d.slice(5, 7)) - 1]}
              </button>
            ))}
          </div>
        </>
      )}
      {access && !access.open && (
        <p style={{ marginTop: 8 }}>{access.reason === "login" ? "Log in to take the quizzes." : "Get a plan to unlock all quizzes."}</p>
      )}
    </>
  );
  if (bare) return body;
  return (
    <div className="ca-box ca-quizbox">
      <h3>▶ Quiz — Current + Static + Statement</h3>
      <p>A full explanation for every question (English + Hindi).</p>
      {body}
    </div>
  );
}

function PdfBox({ access, ok, info, pdfKey, label, scope, skey, url, onUnlock, bare }: {
  access: Access | undefined; ok: boolean; info: Record<string, any>; pdfKey: string; label: string; scope: string; skey: string;
  url: (scope: string, key: string, kind: PdfKind) => string; onUnlock: () => void; bare?: boolean;
}) {
  const cur = info[pdfKey];
  const year = info["all:all"];
  const row = (sc: string, k: string, kind: PdfKind, inf: any, sub?: string) => {
    const m = inf?.kinds?.[kind];
    if (inf?.kinds && !m) return null;               // ye type yahan nahi (jaise saal ka MCQ)
    if (m?.missing) return null;
    const meta = m?.pages ? `${m.pages} pages · ${m.size_kb >= 1024 ? `${(m.size_kb / 1024).toFixed(1)} MB` : `${m.size_kb} KB`}`
      : m && !m.ready ? "Preparing…" : "";
    return (
      <a key={`${sc}${k}${kind}`} className="ca-pdf" href={url(sc, k, kind)} rel="nofollow">
        <span className="ca-pic">{KIND[kind].icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>{sub || KIND[kind].name}<small>{KIND[kind].what}{meta ? ` · ${meta}` : ""}</small></div>
        <em>⬇</em>
      </a>
    );
  };
  if (cur?.enabled === false && year?.enabled === false) return null;
  const body = !access ? <p>…</p> : !ok ? (
    <>
      <p>{access.reason === "login" ? "Log in to download PDFs — it's free." : "Get a plan to download all PDFs."}</p>
      <button className="ca-btn ca-gold ca-wide" onClick={onUnlock}>{access.reason === "login" ? "Log in" : "See plans"}</button>
    </>
  ) : (
    <>
      <div className="ca-cap" style={{ margin: "2px 0 4px" }}>{label}</div>
      {(["quick", "notes", "mcq"] as PdfKind[]).map((k) => row(scope, skey, k, cur))}
      {access.open && (
        <>
          <div className="ca-cap" style={{ margin: "10px 0 4px" }}>Full year</div>
          {(["quick", "notes"] as PdfKind[]).map((k) => row("all", "all", k, year, `${KIND[k].name} — full year`))}
        </>
      )}
      <p style={{ marginTop: 8, fontSize: 11.5 }}>Print and revise — every PDF is in English + Hindi.</p>
    </>
  );
  if (bare) return body;
  return <div className="ca-box"><h3>📄 Download PDF</h3>{body}</div>;
}

const CSS = `
.ca{--ca-navy:#0b1b3a;--ca-green:var(--v2-green,#2e7d46);--ca-red:var(--v2-red,#c0392b);--ca-line:var(--v2-line,rgba(0,0,0,.1));--ca-wash:var(--v2-gold-wash,#fff6de);--ca-chip:var(--v2-chip,#efebe0)}
.ca button{cursor:pointer;font-family:inherit;color:inherit}
.ca .ca-hero{background:linear-gradient(135deg,#0b1b3a,#1c3366);color:#fff;padding:20px 16px}
.ca .ca-hero-in{max-width:1500px;margin:0 auto;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.ca .ca-hero h1{margin:0;font-size:24px;letter-spacing:-.3px;line-height:1.25}
.ca .ca-hero p{margin:4px 0 0;color:#c9d3e6;font-size:13.5px}
.ca .ca-free{background:rgba(245,197,24,.15);border:1px solid rgba(245,197,24,.5);color:#f5c518;border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:700}
.ca .ca-stats{display:flex;gap:8px}
.ca .ca-stats div{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:7px 14px;text-align:center}
.ca .ca-stats b{display:block;font-size:18px}.ca-stats span{font-size:11px;color:#c9d3e6}
.ca .ca-wrap{max-width:1500px;margin:0 auto;display:grid;grid-template-columns:220px minmax(0,1fr) 300px;gap:20px;padding:18px 24px 50px}
.ca .ca-side,.ca .ca-rail{position:sticky;top:76px;align-self:start;display:flex;flex-direction:column;gap:12px;max-height:calc(100vh - 90px);overflow:auto;scrollbar-width:thin}
.ca .ca-main{min-width:0}
.ca .ca-box{background:var(--card);border:1px solid var(--ca-line);border-radius:16px;padding:13px}
.ca .ca-box h3{margin:0 0 6px;font-size:15px}.ca-box p{margin:0 0 10px;font-size:12.5px;color:var(--muted);line-height:1.5}
.ca .ca-cap{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin:2px 4px 8px}
.ca .ca-mon{display:flex;justify-content:space-between;width:100%;padding:8px 10px;border-radius:10px;font-size:13.5px;font-weight:600;border:none;background:none;text-align:left}
.ca .ca-mon em{font-style:normal;color:var(--muted);font-size:12px}
.ca .ca-mon.on{background:var(--ca-wash);color:var(--v2-gold-ink,#8a5a00);box-shadow:inset 3px 0 0 #ffab00}
.ca .ca-h2{margin:0 0 3px;font-size:21px}.ca-h2 span{color:var(--muted);font-weight:600}
.ca .ca-sub{color:var(--muted);font-size:12.5px}
.ca .ca-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ca .ca-chips{display:flex;gap:7px;overflow-x:auto;padding:10px 0 4px;scrollbar-width:none}
.ca .ca-chip{white-space:nowrap;font-size:12.5px;padding:7px 12px;border-radius:999px;background:var(--card);border:1px solid var(--ca-line);font-weight:600}
.ca .ca-chip.on{background:var(--text);color:var(--bg);border-color:var(--text)}
.ca .ca-mchips{display:none}
.ca .ca-days{display:flex;gap:7px;overflow-x:auto;padding:10px 0 2px;scrollbar-width:none}
.ca .ca-day{min-width:52px;text-align:center;background:var(--card);border:1px solid var(--ca-line);border-radius:12px;padding:6px 0;font-size:11px;color:var(--muted)}
.ca .ca-day b{display:block;font-size:16px;color:var(--text)}.ca-day em{display:block;font-style:normal;font-size:10px;color:var(--ca-green);font-weight:700}
.ca .ca-day.on{border-color:#ffab00;background:var(--ca-wash)}
.ca .ca-tools{display:flex;gap:8px;margin:12px 0 10px;align-items:center}
.ca .ca-seg{display:inline-flex;background:var(--ca-chip);border-radius:10px;padding:3px;flex-shrink:0}
.ca .ca-seg button{padding:6px 11px;font-size:12.5px;font-weight:700;border-radius:8px;color:var(--muted);border:none;background:none}
.ca .ca-seg .on{background:var(--card);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.ca .ca-search{flex:1;min-width:0;border:1px solid var(--ca-line);background:var(--card);color:var(--text);border-radius:10px;padding:9px 12px;font-size:13px}
.ca .ca-bhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--ca-wash);border:1px solid #f5c518;border-radius:12px;padding:10px 14px;margin:4px 0 12px}
.ca .ca-bhead b{font-size:15px}
.ca .ca-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.ca .ca-card{background:var(--card);border:1px solid var(--ca-line);border-radius:16px;padding:13px 15px;box-shadow:var(--v2-shadow,none)}
.ca .ca-ctop{display:flex;gap:8px;align-items:center;font-size:11.5px;margin-bottom:6px}
.ca .ca-num{background:var(--ca-navy);color:#fff;border-radius:7px;padding:1px 7px;font-weight:800}
html[data-theme="dark"] .ca .ca-num{background:#2a3f6b}
.ca .ca-date{color:#b7791f;font-weight:700}.ca-cat{color:var(--muted)}
.ca .ca-upd{margin-left:auto;background:#1c3366;color:#fff;border-radius:6px;padding:1px 7px;font-size:10.5px;font-weight:800;letter-spacing:.4px}
html[data-theme="dark"] .ca .ca-upd{background:#2a3f6b}
.ca .ca-en{margin:0;font-size:14.5px;line-height:1.5;font-weight:600}
.ca .ca-hionly{font-family:var(--font-deva),var(--font-jakarta),sans-serif}
.ca .ca-hi{margin:6px 0 0;font-size:13.5px;line-height:1.6;color:var(--text2,#4c4536)}
.ca .ca-arr{color:var(--ca-red);font-weight:800}.ca-card b{color:var(--ca-green)}
.ca .ca-more{margin-top:8px;font-size:12px;font-weight:700;color:var(--v2-gold-ink,#8a5a00);border:none;background:none;padding:0}
.ca .ca-detail{margin-top:8px;border-top:1px dashed var(--ca-line);padding-top:8px;font-size:13px;line-height:1.6}
.ca .ca-detail p{margin:0 0 6px}.ca-dhi{color:var(--text2,#4c4536)}
.ca .ca-gk{background:var(--ca-wash);border-left:3px solid #f5c518;border-radius:6px;padding:7px 10px;font-size:12.5px}
.ca .ca-gk b{color:#b7791f !important;font-size:11px;letter-spacing:.4px}
.ca .ca-sk div{height:12px;border-radius:6px;background:var(--ca-chip);margin:8px 0;animation:caP 1.2s ease-in-out infinite}
.ca .ca-sk div:first-child{width:40%}.ca-sk div:last-child{width:70%}
@keyframes caP{50%{opacity:.45}}
.ca .ca-empty{color:var(--muted);text-align:center;padding:30px 0}
.ca .ca-lock{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:var(--card);border:2px solid #ffab00;border-radius:16px;padding:14px 16px;margin:8px 0 12px}
.ca .ca-welcome{display:flex;gap:10px;align-items:center;background:#2e7d461a;border:1px solid #2e7d46;color:var(--ca-green);border-radius:12px;padding:10px 14px;margin:8px 0 12px;font-weight:700;font-size:13.5px}
.ca .ca-welcome button{margin-left:auto;border:none;background:none;font-size:14px}
.ca .ca-btn{display:inline-flex;gap:6px;align-items:center;justify-content:center;border:1px solid var(--ca-line);background:var(--card);border-radius:10px;padding:8px 13px;font-weight:700;font-size:13px;text-decoration:none;color:var(--text)}
.ca .ca-gold{background:#ffab00 !important;border-color:#ffab00 !important;color:#1a1205 !important}
.ca .ca-wide{width:100%}
.ca .ca-quizbox{background:linear-gradient(135deg,#0b1b3a,#1c3366);color:#fff;border:none}
.ca .ca-quizbox p,.ca .ca-quizbox .ca-cap{color:#c9d3e6}
.ca .ca-qrow{display:flex;width:100%;justify-content:space-between;padding:8px 2px;border:none;border-top:1px solid rgba(127,127,127,.25);background:none;font-size:13px;font-weight:600;text-align:left}
.ca .ca-qrow em{font-style:normal;color:#ffab00}
.ca .ca-quizbox .ca-chip{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:#fff}
.ca .ca-pdf{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--ca-line);font-size:13px;font-weight:600;color:var(--text);text-decoration:none}
.ca .ca-pdf small{display:block;color:var(--muted);font-size:11.5px;font-weight:500}
.ca .ca-pic{width:34px;height:38px;border-radius:7px;background:var(--ca-navy);display:grid;place-items:center;font-size:15px;flex-shrink:0}
.ca .ca-pdf em{font-style:normal;font-weight:800;color:var(--v2-gold-ink,#8a5a00)}
.ca .ca-bar{display:none}
.ca .ca-sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:60;display:flex;align-items:flex-end;justify-content:center}
.ca .ca-sheet{background:var(--card);color:var(--text);width:100%;max-width:560px;max-height:80vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px}
.ca .ca-sheet .ca-qrow{border-top:1px solid var(--ca-line)}
@media (max-width:1100px){.ca .ca-wrap{grid-template-columns:minmax(0,1fr) 290px}.ca .ca-side{display:none}.ca .ca-mchips{display:flex}}
@media (max-width:760px){
 .ca .ca-hero{padding:14px 14px}.ca .ca-hero h1{font-size:20px}.ca .ca-hide-m{display:none !important}.ca .ca-stats{width:100%}.ca .ca-stats div{flex:1;padding:6px}
 .ca .ca-wrap{grid-template-columns:1fr;padding:10px 14px 90px;gap:12px}.ca .ca-rail{display:none}.ca .ca-grid{grid-template-columns:1fr}
 .ca .ca-tools{flex-wrap:wrap}.ca .ca-search{flex-basis:100%}
 .ca .ca-bar{display:flex;position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--ca-line);padding:10px 14px;gap:8px;z-index:40;box-shadow:0 -6px 20px rgba(0,0,0,.08)}
 .ca .ca-bar .ca-btn{flex:1;padding:11px}
}
`;
