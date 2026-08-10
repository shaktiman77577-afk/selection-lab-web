"use client";

// Browser Test — asli pages ko hidden iframe me kholta hai aur unka DOM padhta hai.
//
// Kyun ye kaam karta hai: admin panel aur website ek hi domain par hain, isliye
// iframe ka contentDocument padha ja sakta hai. Matlab hum sach me dekh sakte hain
// ki page render hua ya nahi, images load huin ya nahi, aur layout phaila to nahi.
//
// Do width par test hota hai — 390px (phone) aur 1280px (desktop) — kyunki
// alignment ki dikkat aksar sirf ek hi size par aati hai.

import { useState } from "react";

const GOLD = "#FFAB00";
const CARD = "#12100d";
const BORDER = "rgba(255,255,255,0.12)";

type Finding = {
  page: string;
  view: string;
  status: "ok" | "warn" | "fail";
  message: string;
  fix?: string;
};

const VIEWPORTS = [
  { name: "Phone", width: 390, height: 780 },
  { name: "Desktop", width: 1280, height: 900 },
];

export default function BrowserTest({ pages }: { pages: { path: string; label: string }[] }) {
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState(0);

  async function inspect(path: string, label: string, vp: typeof VIEWPORTS[0]): Promise<Finding[]> {
    return new Promise((resolve) => {
      const out: Finding[] = [];
      const frame = document.createElement("iframe");
      frame.style.cssText = `position:fixed;left:-99999px;top:0;width:${vp.width}px;height:${vp.height}px;border:0;`;
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        try { document.body.removeChild(frame); } catch {}
        resolve(out);
      };

      // 25 second se zyada laga to timeout
      const timer = setTimeout(() => {
        out.push({ page: label, view: vp.name, status: "fail",
          message: "Page did not finish loading within 25 seconds",
          fix: "Check the browser console on this page — something is hanging." });
        finish();
      }, 25000);

      const started = Date.now();

      frame.onload = () => {
        clearTimeout(timer);
        const took = Date.now() - started;

        // React ko render hone ka time do
        setTimeout(() => {
          try {
            const doc = frame.contentDocument;
            const win = frame.contentWindow;
            if (!doc || !win) {
              out.push({ page: label, view: vp.name, status: "fail",
                message: "Could not read the page (blocked)", fix: "" });
              return finish();
            }

            const body = doc.body;
            const text = (body?.innerText || "").trim();

            // 1) Page khaali to nahi
            if (text.length < 40) {
              out.push({ page: label, view: vp.name, status: "fail",
                message: `Page rendered almost nothing (${text.length} characters of text)`,
                fix: "The page is blank for real users. Check the browser console for errors." });
            }

            // 2) Next.js ka error screen
            if (/Application error|404|This page could not be found|Unhandled Runtime Error/i.test(text)) {
              out.push({ page: label, view: vp.name, status: "fail",
                message: "Page is showing an error screen",
                fix: "Check that the file exists at this route and the build succeeded." });
            }

            // 3) Load time
            if (took > 6000) {
              out.push({ page: label, view: vp.name, status: "warn",
                message: `Slow to load — ${(took / 1000).toFixed(1)} seconds`,
                fix: "Large images or slow API responses. Compress images." });
            }

            // 4) ALIGNMENT — horizontal overflow (sabse common layout bug)
            const de = doc.documentElement;
            const overflow = Math.max(body.scrollWidth, de.scrollWidth) - vp.width;
            if (overflow > 8) {
              // Kaun sa element bahar nikla hai wo bhi dhoondo
              let culprit = "";
              try {
                const all = Array.from(doc.querySelectorAll("*")) as HTMLElement[];
                for (const el of all) {
                  const r = el.getBoundingClientRect();
                  if (r.width > 0 && r.right > vp.width + 8) {
                    const tag = el.tagName.toLowerCase();
                    const txt = (el.innerText || "").trim().slice(0, 28);
                    culprit = txt ? `<${tag}> "${txt}"` : `<${tag}>`;
                    break;
                  }
                }
              } catch {}
              out.push({ page: label, view: vp.name, status: "fail",
                message: `Content is ${overflow}px wider than the screen — sideways scrolling${culprit ? `. First element out of bounds: ${culprit}` : ""}`,
                fix: "Something has a fixed width or long unbroken text. This looks broken on phones." });
            }

            // 5) Images — asli rendered size
            const imgs = Array.from(doc.querySelectorAll("img")) as HTMLImageElement[];
            const broken = imgs.filter((im) => im.complete && im.naturalWidth === 0);
            const tiny = imgs.filter((im) => im.naturalWidth > 0 && im.naturalWidth < 300 && im.clientWidth > 300);
            const stretched = imgs.filter((im) => {
              if (!im.naturalWidth || !im.clientWidth || !im.clientHeight) return false;
              const natural = im.naturalWidth / im.naturalHeight;
              const shown = im.clientWidth / im.clientHeight;
              const fit = getComputedStyle(im).objectFit;
              return fit === "fill" && Math.abs(natural - shown) > 0.25;
            });

            if (broken.length) {
              out.push({ page: label, view: vp.name, status: "fail",
                message: `${broken.length} image(s) failed to load: ${broken.map((i) => (i.src || "").split("/").pop()).slice(0, 3).join(", ")}`,
                fix: "Broken image links. Re-upload and update the URL." });
            }
            if (tiny.length) {
              out.push({ page: label, view: vp.name, status: "warn",
                message: `${tiny.length} image(s) are being upscaled — e.g. a ${tiny[0].naturalWidth}px image shown at ${Math.round(tiny[0].clientWidth)}px, so it looks blurry`,
                fix: "Upload a larger version (at least 1280px wide)." });
            }
            if (stretched.length) {
              out.push({ page: label, view: vp.name, status: "warn",
                message: `${stretched.length} image(s) look squashed or stretched`,
                fix: "Use object-fit: cover or contain instead of fill." });
            }
            if (imgs.length && !broken.length && !tiny.length && !stretched.length) {
              out.push({ page: label, view: vp.name, status: "ok",
                message: `${imgs.length} image(s) render correctly` });
            }

            // 6) Tap targets — mobile par chhote buttons
            if (vp.width < 500) {
              const btns = Array.from(doc.querySelectorAll("button, a")) as HTMLElement[];
              const small = btns.filter((b) => {
                const r = b.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && r.height < 32;
              });
              if (small.length > 3) {
                out.push({ page: label, view: vp.name, status: "warn",
                  message: `${small.length} buttons/links are under 32px tall — hard to tap on a phone`,
                  fix: "Make tap targets at least 40px tall." });
              }
            }

            // 7) Text jo container se bahar nikal raha ho
            const clipped = (Array.from(doc.querySelectorAll("h1,h2,h3,p,span,div")) as HTMLElement[])
              .filter((el) => el.scrollWidth > el.clientWidth + 6 && el.clientWidth > 60 &&
                              getComputedStyle(el).overflow === "visible" &&
                              (el.innerText || "").trim().length > 0);
            if (clipped.length > 2) {
              out.push({ page: label, view: vp.name, status: "warn",
                message: `${clipped.length} text elements overflow their box — e.g. "${(clipped[0].innerText || "").trim().slice(0, 34)}"`,
                fix: "Long titles need wrapping or truncation." });
            }

            // Sab theek
            if (out.length === 0) {
              out.push({ page: label, view: vp.name, status: "ok",
                message: `Renders correctly in ${(took / 1000).toFixed(1)}s — no layout problems` });
            }
          } catch (e: any) {
            out.push({ page: label, view: vp.name, status: "warn",
              message: `Could not fully inspect — ${String(e).slice(0, 80)}` });
          }
          finish();
        }, 2500);
      };

      frame.onerror = () => {
        clearTimeout(timer);
        out.push({ page: label, view: vp.name, status: "fail", message: "Page failed to load" });
        finish();
      };

      frame.src = path;
      document.body.appendChild(frame);
    });
  }

  async function run() {
    setRunning(true);
    setFindings([]);
    setDone(0);
    const all: Finding[] = [];
    const total = pages.length * VIEWPORTS.length;
    let n = 0;

    for (const p of pages) {
      for (const vp of VIEWPORTS) {
        setCurrent(`${p.label} — ${vp.name} (${vp.width}px)`);
        const res = await inspect(p.path, p.label, vp);
        all.push(...res);
        n++;
        setDone(Math.round((n / total) * 100));
        setFindings([...all]);
      }
    }
    setCurrent("");
    setRunning(false);
  }

  const COLORS: Record<string, string> = { ok: "#5dd97c", warn: GOLD, fail: "#ff6b6b" };
  const fails = findings.filter((f) => f.status === "fail").length;
  const warns = findings.filter((f) => f.status === "warn").length;

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, color: "#c8c0ae", lineHeight: 1.6 }}>
          Ye har page ko sach me kholta hai — phone (390px) aur desktop (1280px) dono par —
          aur dekhta hai ki render hua ya nahi, images load huin ya nahi, kuch screen se bahar
          to nahi nikal raha, aur buttons tap karne layak hain ya nahi.
        </div>
        <button onClick={run} disabled={running}
          style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12, padding: "12px 18px",
                   fontWeight: 800, fontSize: 14.5, cursor: "pointer", width: "100%", marginTop: 12, opacity: running ? 0.6 : 1 }}>
          {running ? "Testing pages..." : `🌐 Open and test all ${pages.length} pages`}
        </button>
      </div>

      {running && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "#c8c0ae", textAlign: "center" }}>{current}</div>
          <div style={{ height: 8, borderRadius: 5, background: "rgba(255,255,255,0.08)", marginTop: 12, overflow: "hidden" }}>
            <div style={{ width: `${done}%`, height: "100%", background: GOLD, borderRadius: 5, transition: "width .4s" }} />
          </div>
          <div style={{ fontSize: 11.5, color: "#9a917f", textAlign: "center", marginTop: 6 }}>
            {done}%{fails > 0 ? ` · ${fails} problems found so far` : ""}
          </div>
        </div>
      )}

      {findings.length > 0 && !running && (
        <div
          style={{
            background: CARD,
            border: `1px solid ${fails ? "#ff6b6b55" : warns ? GOLD + "55" : "#5dd97c55"}`,
            borderLeft: `5px solid ${fails ? "#ff6b6b" : warns ? GOLD : "#5dd97c"}`,
            borderRadius: 14, padding: 16, marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: fails ? "#ff6b6b" : warns ? GOLD : "#5dd97c" }}>
            {fails ? `${fails} rendering problems` : warns ? `${warns} things to improve` : "All pages render correctly"}
          </div>
          <div style={{ fontSize: 12, color: "#9a917f", marginTop: 4 }}>
            {pages.length} pages × {VIEWPORTS.length} screen sizes tested
          </div>
        </div>
      )}

      {(["fail", "warn", "ok"] as const).map((level) => {
        const items = findings.filter((f) => f.status === level);
        if (!items.length) return null;
        return (
          <div key={level} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 800, color: COLORS[level], marginBottom: 8 }}>
              {level === "fail" ? "BROKEN" : level === "warn" ? "NEEDS ATTENTION" : "WORKING"} ({items.length})
            </div>
            {items.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 10, background: CARD,
                border: `1px solid ${level === "ok" ? BORDER : COLORS[level] + "44"}`,
                borderRadius: 11, padding: "10px 12px", marginBottom: 6 }}>
                <span style={{ color: COLORS[level], fontWeight: 800, fontSize: 13 }}>
                  {level === "ok" ? "✓" : level === "warn" ? "!" : "✕"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {f.page}
                    <span style={{ fontSize: 10, color: "#7a7263", fontWeight: 600, marginLeft: 6 }}>{f.view}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 2, lineHeight: 1.5 }}>{f.message}</div>
                  {f.fix && (
                    <div style={{ fontSize: 11.5, color: COLORS[level], marginTop: 4, lineHeight: 1.5 }}>→ {f.fix}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
