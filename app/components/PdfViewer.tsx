"use client";

// In-page PDF viewer — PDF.js se pages ko canvas par render karta hai.
//
// Kyun canvas: mobile Chrome <iframe> ke andar PDF nahi dikhata (sirf "Open"
// button deta hai). Canvas har device par chalta hai. Bonus: koi file URL
// expose nahi hota, isliye link share karna bhi mushkil hai.
//
// Tezi (Oct 2026 — bade PDF par "Loading PDF…" bahut der atakta tha):
//  - Saaf haal: "Preparing your PDF…" (server watermark laga raha hai), phir
//    "Downloading 4.2 / 18 MB · 23%".
//  - Pages scroll ke saath bante hain (aage ke 2 screen tak); door gaye page ka
//    canvas khaali — 300 page ke PDF me bhi phone ki memory nahi bharti.
//  - Atak jaye (kuch na aaye) ya fail ho → saaf sandesh + "Try again".

import { useEffect, useRef, useState } from "react";

const PDFJS_VER = "3.11.174";
const PDFJS_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.worker.min.js`;

const PREPARE_TIMEOUT = 120_000; // server se pehla byte itni der me na aaye to ruk jao
const STALL_TIMEOUT = 45_000;    // download beech me itni der ruka rahe to ruk jao

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

/** PDF.js ko ek hi baar load karta hai (CDN se). */
function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PDFJS_SRC}"]`);
    const onReady = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      } else {
        reject(new Error("PDF viewer failed to load. Please check your internet and try again."));
      }
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("PDF viewer failed to load. Please try again.")));
      return;
    }
    const s = document.createElement("script");
    s.src = PDFJS_SRC;
    s.async = true;
    s.onload = onReady;
    s.onerror = () => reject(new Error("PDF viewer failed to load. Please check your internet and try again."));
    document.body.appendChild(s);
  });
}

const mb = (n: number) => (n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0);

type Stage = "preparing" | "downloading" | "opening" | "ready" | "error";

export default function PdfViewer({
  url,
  fileName = "notes.pdf",
}: {
  url: string;          // backend ka secure-pdf endpoint
  fileName?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>("preparing");
  const [err, setErr] = useState("");
  const [pages, setPages] = useState(0);
  const [blobUrl, setBlobUrl] = useState("");
  const [got, setGot] = useState(0);
  const [total, setTotal] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // user abhi load nahi hua (?user_id= khaali) — tab tak maangna bekaar (422 aata)
  const waitingForUser = /[?&]user_id=(&|$)/.test(url);

  useEffect(() => {
    if (waitingForUser) return;
    let cancelled = false;
    let madeBlob = "";
    let pdfDoc: any = null;
    let observer: IntersectionObserver | null = null;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let timedOut = "";
    const arm = (ms: number, why: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timedOut = why; ctrl.abort(); }, ms);
    };

    setStage("preparing");
    setErr("");
    setPages(0);
    setGot(0);
    setTotal(0);
    setBlobUrl("");
    if (holder.current) holder.current.innerHTML = "";

    (async () => {
      try {
        arm(PREPARE_TIMEOUT, "The PDF is taking too long to prepare.");
        const [pdfjsLib, res] = await Promise.all([loadPdfJs(), fetch(url, { signal: ctrl.signal })]);
        if (!res.ok) {
          let msg = `Could not load PDF (${res.status})`;
          try {
            const j = await res.json();
            if (j?.detail) msg = typeof j.detail === "string" ? j.detail : msg;
          } catch {}
          throw new Error(msg);
        }

        // ── Download, % ke saath ──
        const size = Number(res.headers.get("content-length")) || 0;
        if (!cancelled) { setTotal(size); setStage("downloading"); }
        let buf: ArrayBuffer;
        if (res.body && typeof res.body.getReader === "function") {
          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          let n = 0;
          let lastPaint = 0;
          arm(STALL_TIMEOUT, "The download stopped. Your internet may be slow.");
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (cancelled) return;
            chunks.push(value);
            n += value.length;
            arm(STALL_TIMEOUT, "The download stopped. Your internet may be slow.");
            const now = Date.now();
            if (now - lastPaint > 150) { lastPaint = now; setGot(n); }
          }
          const all = new Uint8Array(n);
          let off = 0;
          for (const c of chunks) { all.set(c, off); off += c.length; }
          buf = all.buffer;
          setGot(n);
        } else {
          buf = await res.arrayBuffer();
        }
        if (timer) clearTimeout(timer);
        if (cancelled) return;
        setStage("opening");

        // Download button ke liye blob — getDocument se PEHLE (PDF.js buffer le leta hai)
        madeBlob = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
        setBlobUrl(madeBlob);

        pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;
        setPages(pdfDoc.numPages);

        const box = holder.current;
        if (!box) return;
        const cw = box.clientWidth;
        const width = cw > 60 ? cw - 20 : 320;
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // sharp but not huge
        const first = await pdfDoc.getPage(1);
        const ratio = first.getViewport({ scale: 1 }).height / first.getViewport({ scale: 1 }).width;

        // Har page ki jagah pehle se (sahi lambai) — scroll bar theek, pages baad me
        const slots: HTMLDivElement[] = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const slot = document.createElement("div");
          slot.dataset.page = String(i);
          slot.style.width = "100%";
          slot.style.aspectRatio = `1 / ${ratio}`;
          slot.style.marginBottom = "10px";
          slot.style.borderRadius = "6px";
          slot.style.background = "#fff";
          slot.style.overflow = "hidden";
          slot.style.position = "relative";
          box.appendChild(slot);
          slots.push(slot);
        }

        const rendering = new Set<number>();
        const drawn = new Set<number>();
        async function draw(n: number) {
          if (rendering.has(n) || drawn.has(n) || cancelled) return;
          rendering.add(n);
          try {
            const page = await pdfDoc.getPage(n);
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: (width / base.width) * dpr });
            const slot = slots[n - 1];
            slot.style.aspectRatio = `${base.width} / ${base.height}`;
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = "100%";
            canvas.style.height = "auto";
            canvas.style.display = "block";
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            // canvas + canvasContext dono — v3 (abhi CDN wala) context leta hai, naye pdf.js canvas
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
            if (cancelled) return;
            slot.innerHTML = "";
            slot.appendChild(canvas);
            drawn.add(n);
            if (n === 1) setStage("ready");
          } catch (e) {
            // ek page na bane to baaki chalte rahein
            console.warn("PDF page render failed", n, e);
            if (n === 1) throw e;
          } finally {
            rendering.delete(n);
          }
        }
        function clear(n: number) {
          if (!drawn.has(n)) return;
          const c = slots[n - 1].querySelector("canvas");
          if (c) { c.width = 0; c.height = 0; }            // memory turant khaali
          slots[n - 1].innerHTML = "";
          drawn.delete(n);
        }

        // Aage-peeche ~2 screen tak bano; usse door gaye to mita do
        observer = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              const n = Number((e.target as HTMLElement).dataset.page);
              if (e.isIntersecting) draw(n);
              else clear(n);
            }
          },
          { root: box, rootMargin: "200% 0px" },
        );
        slots.forEach((s) => observer!.observe(s));
        await draw(1);
        if (!cancelled) setStage("ready");
      } catch (e: any) {
        if (timer) clearTimeout(timer);
        if (cancelled) return;
        const aborted = e?.name === "AbortError";
        setErr(aborted ? (timedOut || "Loading stopped.") : (e?.message || "Could not load PDF"));
        setStage("error");
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      ctrl.abort();
      observer?.disconnect();
      try { pdfDoc?.destroy(); } catch {}
      if (madeBlob) URL.revokeObjectURL(madeBlob);
    };
  }, [url, attempt, waitingForUser]);

  const pct = total ? Math.min(100, Math.round((got / total) * 100)) : 0;
  const loading = stage === "preparing" || stage === "downloading" || stage === "opening";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
      <div
        ref={holder}
        style={{
          maxHeight: "72vh",
          overflowY: "auto",
          padding: pages > 0 ? 10 : 0,           // load hote waqt khaali grey patti nahi
          background: "var(--chip)",
          WebkitOverflowScrolling: "touch",
        }}
      />

      {loading && stage !== "opening" && (
        <div style={{ padding: "28px 22px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
            {stage === "preparing" ? "Preparing your PDF…" : "Downloading PDF…"}
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--chip)", overflow: "hidden", maxWidth: 360, margin: "0 auto" }}>
            <div
              style={{
                height: "100%",
                width: stage === "preparing" ? "8%" : total ? `${Math.max(pct, 3)}%` : "40%",
                background: "#FFAB00",
                borderRadius: 99,
                transition: "width .2s",
              }}
            />
          </div>
          <div style={{ fontSize: 12.5, marginTop: 10 }}>
            {stage === "preparing"
              ? "Adding your watermark. The first time can take a few seconds."
              : total
                ? `${mb(got)} / ${mb(total)} MB · ${pct}%`
                : `${mb(got)} MB downloaded`}
          </div>
        </div>
      )}
      {stage === "opening" && (
        <div style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>Opening PDF…</div>
      )}

      {stage === "error" && (
        <div style={{ padding: 26, textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <p style={{ fontSize: 14, color: "#e05555", margin: "8px 0 14px" }}>{err}</p>
          <button
            onClick={() => setAttempt((a) => a + 1)}
            style={{
              background: "#FFAB00", color: "#1a1a1a", border: "none", borderRadius: 10,
              padding: "10px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}

      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {!!blobUrl && (
          <a
            href={blobUrl}
            download={fileName}
            style={{
              background: "#FFAB00",
              color: "#1a1a1a",
              borderRadius: 10,
              padding: "10px 18px",
              fontWeight: 800,
              fontSize: 13.5,
              textDecoration: "none",
            }}
          >
            ⬇ Download PDF
          </a>
        )}
        {pages > 0 && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{pages} pages</span>
        )}
        <span style={{ fontSize: 11.5, color: "var(--muted)", flex: 1, minWidth: 180 }}>
          🔒 Your mobile number is printed on this PDF. Please do not share it.
        </span>
      </div>
    </div>
  );
}
