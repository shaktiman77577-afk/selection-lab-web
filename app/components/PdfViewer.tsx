"use client";

// In-page PDF viewer — PDF.js se pages ko canvas par render karta hai.
//
// Kyun canvas: mobile Chrome <iframe> ke andar PDF nahi dikhata (sirf "Open"
// button deta hai). Canvas har device par chalta hai. Bonus: koi file URL
// expose nahi hota, isliye link share karna bhi mushkil hai.

import { useEffect, useRef, useState } from "react";

const PDFJS_VER = "3.11.174";
const PDFJS_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.worker.min.js`;

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
        reject(new Error("PDF viewer failed to load"));
      }
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () => reject(new Error("PDF viewer failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = PDFJS_SRC;
    s.async = true;
    s.onload = onReady;
    s.onerror = () => reject(new Error("PDF viewer failed to load"));
    document.body.appendChild(s);
  });
}

export default function PdfViewer({
  url,
  fileName = "notes.pdf",
}: {
  url: string;          // backend ka secure-pdf endpoint
  fileName?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [err, setErr] = useState("");
  const [pages, setPages] = useState(0);
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let madeBlob = "";
    setStatus("loading");
    setErr("");
    setPages(0);
    if (holder.current) holder.current.innerHTML = "";

    (async () => {
      try {
        const [pdfjsLib, res] = await Promise.all([loadPdfJs(), fetch(url)]);
        if (!res.ok) {
          let msg = `Could not load PDF (${res.status})`;
          try {
            const j = await res.json();
            if (j?.detail) msg = j.detail;
          } catch {}
          throw new Error(msg);
        }
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        // Download button ke liye blob (same bytes, dobara fetch nahi)
        madeBlob = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
        if (!cancelled) setBlobUrl(madeBlob);

        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;
        setPages(pdf.numPages);

        const width = holder.current?.clientWidth || 320;
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // sharp but not huge

        for (let n = 1; n <= pdf.numPages; n++) {
          if (cancelled) return;
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const viewport = page.getViewport({ scale: scale * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.marginBottom = "10px";
          canvas.style.borderRadius = "6px";
          canvas.style.background = "#fff";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          holder.current?.appendChild(canvas);
          if (n === 1) setStatus("ready");
        }
        if (!cancelled) setStatus("ready");
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Could not load PDF");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (madeBlob) URL.revokeObjectURL(madeBlob);
    };
  }, [url]);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
      <div
        ref={holder}
        style={{
          maxHeight: "72vh",
          overflowY: "auto",
          padding: 10,
          background: "var(--chip)",
          WebkitOverflowScrolling: "touch",
        }}
      />

      {status === "loading" && (
        <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Loading PDF…
        </div>
      )}

      {status === "error" && (
        <div style={{ padding: 26, textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <p style={{ fontSize: 14, color: "#e05555", margin: "8px 0 0" }}>{err}</p>
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
          🔒 Is PDF par aapka mobile number print hai. Kripya share na karein.
        </span>
      </div>
    </div>
  );
}
