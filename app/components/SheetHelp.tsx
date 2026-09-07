"use client";

/**
 * SheetHelp.tsx — bachche ko sheet banana sikhane wala helper.
 *
 * Kagaz se dekh kar Excel me sheet banana pehli baar me samajh nahi aata.
 * Likh kar samjhane se bhi nahi — "fill handle kheenchiye" padhkar koi nahi
 * samajhta ki kya kheenchna hai. Isliye har baat CHAL KAR dikhti hai.
 *
 * KHULNE KA WAQT: apne aap sirf brief screen par khulta hai, jab timer
 * shuru nahi hua. Test ke beech me apne aap khulta to bachche ka waqt help
 * padhne me jaata — aur exam me wo waqt sabse keemti cheez hai. Beech me
 * button rehta hai, par khulega tabhi jab wo khud dabaye.
 */

import { useState, useEffect, type CSSProperties } from "react";

const GOLD = "#FFAB00";
const BLUE = "#1a73e8";
const LINE = "#d0d7e2";
const HEAD = "#eef1f6";

type Step = { title: string; text: string; demo: "type" | "move" | "formula" | "fill" | "format" | "start" };

const STEPS: Step[] = [
  { demo: "type", title: "Cell par tap karke likhiye",
    text: "Jis cell me likhna hai us par tap kijiye — keyboard wahin khul jayega. Upar wali bar me bhi likh sakte hain." },
  { demo: "move", title: "Enter se neeche, Tab se daayein",
    text: "Ek cell bhar kar Enter dabaiye, agla cell neeche khul jayega. Tab dabaiye to daayein wala. Baar-baar tap karne ki zaroorat nahi." },
  { demo: "formula", title: "Formula = se shuru hota hai",
    text: "Cell me =C2*D2 likh kar Enter dabaiye. Cell me jawab dikhega, aur formula upar wali bar me. Bilkul Excel jaisa." },
  { demo: "fill", title: "Formula neeche kheenchiye",
    text: "Ek baar likh kar cell ke kone ka neela chaukor neeche kheenchiye — poora column bhar jayega. Har row me alag se likhne ki zaroorat nahi." },
  { demo: "format", title: "Bold aur Merge",
    text: "Ungli kheench kar kai cell chuniye, phir B dabaiye. Title ke liye cell chun kar Merge dabaiye. Dono par exam me marks hain." },
  { demo: "start", title: "Table sahi cell se shuru kijiye",
    text: "Question paper me likha hota hai ki table kahan se shuru honi chahiye. Galat jagah se shuru hui to asli exam me poora printout invalid ho jata hai." },
];

export default function SheetHelp({ startCell = "A1" }: { startCell?: string }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  // Pehli baar apne aap khul jaye. Uske baad sirf button se.
  useEffect(() => {
    try {
      if (!localStorage.getItem("sl_ws_help_seen")) {
        setOpen(true);
        localStorage.setItem("sl_ws_help_seen", "1");
      }
    } catch { /* private mode — koi baat nahi, button to hai hi */ }
  }, []);

  const s = STEPS[i];

  return (
    <>
      {/* Kinare par laga button — test ke dauran bhi haath ke paas rehta hai */}
      <button
        onClick={() => { setI(0); setOpen(true); }}
        aria-label="Kaise karna hai"
        style={{
          position: "fixed", right: 0, top: "45%", zIndex: 40,
          background: GOLD, color: "#1a1a1a", border: "none",
          borderRadius: "10px 0 0 10px", padding: "12px 9px",
          fontWeight: 900, fontSize: 13, cursor: "pointer",
          writingMode: "vertical-rl", letterSpacing: 0.5,
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
        }}
      >
        ? Madad
      </button>

      {!open ? null : (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)", color: "var(--text)",
              borderRadius: "16px 16px 0 0", padding: 16,
              width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto",
              border: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
                {i + 1} / {STEPS.length}
              </span>
              <span style={{ flex: 1 }} />
              <button onClick={() => setOpen(false)}
                      style={{ background: "transparent", border: "none", color: "var(--muted)",
                               fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 0 }}>
                ×
              </button>
            </div>

            <h3 style={{ fontSize: 16.5, fontWeight: 900, margin: "0 0 6px" }}>{s.title}</h3>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 12px" }}>
              {s.demo === "start"
                ? `Is test me table ${startCell} se shuru honi chahiye. ` + s.text
                : s.text}
            </p>

            {/* key badalne par animation dobara chalti hai */}
            <Demo key={i} kind={s.demo} startCell={startCell} />

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}
                      style={{ ...btn, opacity: i === 0 ? 0.4 : 1 }}>
                ← Pichhla
              </button>
              {i < STEPS.length - 1 ? (
                <button onClick={() => setI(i + 1)} style={{ ...btn, background: GOLD, color: "#1a1a1a", border: "none" }}>
                  Agla →
                </button>
              ) : (
                <button onClick={() => setOpen(false)}
                        style={{ ...btn, background: GOLD, color: "#1a1a1a", border: "none" }}>
                  Samajh gaya
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Chalti hui misaal ──────────────────────────────────────────────────
   Har step ki apni chhoti sheet, jisme cheez hoti hui dikhti hai. CSS
   keyframes hi kaafi hain — koi library nahi. */
function Demo({ kind, startCell }: { kind: Step["demo"]; startCell: string }) {
  const cell: CSSProperties = {
    border: `1px solid ${LINE}`, height: 28, background: "#fff",
    fontSize: 12, color: "#111", padding: "0 6px", position: "relative",
    display: "flex", alignItems: "center", whiteSpace: "nowrap",
  };
  const head: CSSProperties = {
    ...cell, background: HEAD, color: "#5f6a7d", fontSize: 10.5,
    fontWeight: 700, justifyContent: "center", height: 20,
  };
  const grid = (cols: number): CSSProperties => ({
    display: "grid", gridTemplateColumns: `26px repeat(${cols}, 1fr)`,
    border: `1px solid ${LINE}`, borderRadius: 6, overflow: "hidden",
    background: "#fff",
  });

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 10 }}>
      <style>{`
        @keyframes slFinger { 0%,10%{opacity:0} 15%{opacity:1} 45%{opacity:1} 55%{opacity:0} 100%{opacity:0} }
        @keyframes slTypeA  { 0%,20%{width:0} 60%,100%{width:100%} }
        @keyframes slSel1   { 0%,45%{opacity:1} 50%,100%{opacity:0} }
        @keyframes slSel2   { 0%,45%{opacity:0} 50%,100%{opacity:1} }
        @keyframes slFlip   { 0%,45%{opacity:1} 55%,100%{opacity:0} }
        @keyframes slFlip2  { 0%,45%{opacity:0} 55%,100%{opacity:1} }
        @keyframes slDrop   { 0%{transform:translateY(0)} 100%{transform:translateY(84px)} }
        @keyframes slFade1  { 0%,25%{opacity:0} 35%,100%{opacity:1} }
        @keyframes slFade2  { 0%,45%{opacity:0} 55%,100%{opacity:1} }
        @keyframes slFade3  { 0%,65%{opacity:0} 75%,100%{opacity:1} }
        @keyframes slBold   { 0%,50%{font-weight:400} 60%,100%{font-weight:800} }
        @keyframes slPulse  { 0%,100%{box-shadow:0 0 0 0 rgba(26,115,232,.5)} 50%{box-shadow:0 0 0 7px rgba(26,115,232,0)} }
        .slAnim { animation-duration:3s; animation-iteration-count:infinite; animation-timing-function:ease-in-out; }
      `}</style>

      {kind === "type" && (
        <div style={grid(3)}>
          <div style={head} /><div style={head}>A</div><div style={head}>B</div><div style={head}>C</div>
          <div style={head}>1</div>
          <div style={{ ...cell, outline: `2px solid ${BLUE}`, outlineOffset: -2 }}>
            <span className="slAnim" style={{ animationName: "slTypeA", overflow: "hidden", display: "inline-block" }}>Raju</span>
            <span className="slAnim" style={{
              animationName: "slFinger", position: "absolute", right: -6, bottom: -8,
              width: 16, height: 16, borderRadius: "50%", background: "rgba(26,115,232,.35)",
              border: `2px solid ${BLUE}`,
            }} />
          </div>
          <div style={cell} /><div style={cell} />
          <div style={head}>2</div><div style={cell} /><div style={cell} /><div style={cell} />
        </div>
      )}

      {kind === "move" && (
        <div style={grid(3)}>
          <div style={head} /><div style={head}>A</div><div style={head}>B</div><div style={head}>C</div>
          <div style={head}>1</div>
          <div style={cell}>Raju
            <span className="slAnim" style={{ animationName: "slSel1", position: "absolute", inset: 0,
              outline: `2px solid ${BLUE}`, outlineOffset: -2, pointerEvents: "none" }} />
          </div>
          <div style={cell}>
            <span className="slAnim" style={{ animationName: "slFade2" }}>Sales</span>
          </div>
          <div style={cell} />
          <div style={head}>2</div>
          <div style={cell}>
            <span className="slAnim" style={{ animationName: "slSel2", position: "absolute", inset: 0,
              outline: `2px solid ${BLUE}`, outlineOffset: -2, pointerEvents: "none" }} />
          </div>
          <div style={cell} /><div style={cell} />
        </div>
      )}

      {kind === "formula" && (
        <div style={grid(3)}>
          <div style={head} /><div style={head}>C</div><div style={head}>D</div><div style={head}>E</div>
          <div style={head}>2</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>10</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>50</div>
          <div style={{ ...cell, outline: `2px solid ${BLUE}`, outlineOffset: -2, justifyContent: "flex-end" }}>
            <span className="slAnim" style={{ animationName: "slFlip", position: "absolute", right: 6,
              fontFamily: "monospace", fontSize: 11 }}>=C2*D2</span>
            <span className="slAnim" style={{ animationName: "slFlip2", position: "absolute", right: 6,
              fontWeight: 700 }}>500</span>
          </div>
        </div>
      )}

      {kind === "fill" && (
        <div style={{ position: "relative", ...grid(3) }}>
          <div style={head} /><div style={head}>C</div><div style={head}>D</div><div style={head}>E</div>
          <div style={head}>2</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>10</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>50</div>
          <div style={{ ...cell, outline: `2px solid ${BLUE}`, outlineOffset: -2, justifyContent: "flex-end", fontWeight: 700 }}>
            500
            <span className="slAnim" style={{
              animationName: "slDrop", animationIterationCount: "infinite",
              position: "absolute", right: -5, bottom: -5, width: 10, height: 10,
              background: BLUE, border: "2px solid #fff", borderRadius: 2, zIndex: 3,
            }} />
          </div>
          <div style={head}>3</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>3</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>120</div>
          <div style={{ ...cell, justifyContent: "flex-end", fontWeight: 700 }}>
            <span className="slAnim" style={{ animationName: "slFade1" }}>360</span>
          </div>
          <div style={head}>4</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>7</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>80</div>
          <div style={{ ...cell, justifyContent: "flex-end", fontWeight: 700 }}>
            <span className="slAnim" style={{ animationName: "slFade2" }}>560</span>
          </div>
          <div style={head}>5</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>12</div>
          <div style={{ ...cell, justifyContent: "flex-end" }}>45</div>
          <div style={{ ...cell, justifyContent: "flex-end", fontWeight: 700 }}>
            <span className="slAnim" style={{ animationName: "slFade3" }}>540</span>
          </div>
        </div>
      )}

      {kind === "format" && (
        <div style={grid(3)}>
          <div style={head} /><div style={head}>A</div><div style={head}>B</div><div style={head}>C</div>
          <div style={head}>1</div>
          <div style={{ ...cell, gridColumn: "span 3", justifyContent: "center", background: "#e8f0fe" }}>
            <span className="slAnim" style={{ animationName: "slBold" }}>SALARY SHEET</span>
          </div>
          <div style={head}>2</div>
          <div style={{ ...cell, background: "#e8f0fe" }}>
            <span className="slAnim" style={{ animationName: "slBold" }}>Code</span>
          </div>
          <div style={{ ...cell, background: "#e8f0fe" }}>
            <span className="slAnim" style={{ animationName: "slBold" }}>Dept</span>
          </div>
          <div style={{ ...cell, background: "#e8f0fe" }}>
            <span className="slAnim" style={{ animationName: "slBold" }}>Basic</span>
          </div>
        </div>
      )}

      {kind === "start" && (
        <div style={grid(3)}>
          <div style={head} /><div style={head}>A</div><div style={head}>B</div><div style={head}>C</div>
          <div style={head}>1</div>
          <div className="slAnim" style={{ ...cell, animationName: "slPulse", outline: `2px solid ${BLUE}`, outlineOffset: -2 }}>
            <span style={{ fontSize: 10.5, color: BLUE, fontWeight: 800 }}>{startCell}</span>
          </div>
          <div style={cell} /><div style={cell} />
          <div style={head}>2</div><div style={cell} /><div style={cell} /><div style={cell} />
          <div style={head}>3</div><div style={cell} /><div style={cell} /><div style={cell} />
        </div>
      )}
    </div>
  );
}

const btn: CSSProperties = {
  flex: 1, background: "transparent", color: "var(--text)",
  border: "1px solid var(--line)", borderRadius: 10, padding: "11px 0",
  fontWeight: 800, fontSize: 13.5, cursor: "pointer",
};
