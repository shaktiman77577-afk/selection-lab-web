"use client";

// PDF course ka FREE PREVIEW (Oct 2026) — shuru ke kuch pages (cover sahit).
//
// Backend pages ko IMAGE bana kar deta hai — PDF file ya uska link browser tak
// kabhi nahi aata, isliye bina kharide download ka koi raasta nahi.
//   GET /courses/{id}/preview             -> { pages, total_pages, v }
//   GET /courses/{id}/preview/page/{n}?v= -> WebP image
// Kitne pages: <50 -> 2, 50-100 -> 3, 100+ -> 5 (server tay karta hai).
//
// Progress: pehle "Loading preview…" (server PDF tayyar kar raha hai, seconds
// ke saath), phir "Page 2 of 5 loaded" ki patti — student ko atka hua na lage.

import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/config";

const PREPARE_TIMEOUT = 120_000;

type Info = { pages: number; total_pages: number; v: string };

export default function PdfPreview({
  courseId,
  title,
  open,
  onClose,
  buyLabel,
  onBuy,
}: {
  courseId: number;
  title: string;
  open: boolean;
  onClose: () => void;
  buyLabel?: string;
  onBuy?: () => void;
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [secs, setSecs] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, number>>({}); // page -> retry count
  const [bust, setBust] = useState<Record<number, number>>({}); // "Retry" dabaya -> naya URL
  const closeBtn = useRef<HTMLButtonElement>(null);
  // onClose har render par naya aata hai — ref me rakho, warna neeche wala effect
  // har second chalta (focus baar-baar close button par kudta)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Server se jaankari — sirf jab khula ho (aur pehle se na mili ho)
  useEffect(() => {
    if (!open || info) return;
    const ctrl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, PREPARE_TIMEOUT);
    const started = Date.now();
    const tick = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 500);
    setErr("");
    setSecs(0);

    fetch(`${API_URL}/courses/${courseId}/preview`, { signal: ctrl.signal })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error((d && typeof d.detail === "string" && d.detail) || `Could not load preview (${r.status})`);
        if (!d?.pages) throw new Error("No preview available for this course");
        setInfo({ pages: d.pages, total_pages: d.total_pages, v: d.v });
      })
      .catch((e) => {
        if (ctrl.signal.aborted && !timedOut) return; // band kar diya
        setErr(timedOut ? "The preview is taking too long. Please try again." : e?.message || "Could not load preview");
      })
      .finally(() => {
        clearTimeout(timer);
        clearInterval(tick);
      });

    return () => {
      clearTimeout(timer);
      clearInterval(tick);
      ctrl.abort();
    };
  }, [open, info, courseId, attempt]);

  // Khulne par: Esc se band, peeche ka page scroll na ho
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const n = info?.pages || 0;
  const done = Object.keys(loaded).length;
  const allDone = !!info && done >= n;
  // Patti: server wala hissa 30% tak (dheere badhta), phir har page ke saath baaki
  const pct = !info ? Math.min(28, 6 + secs * 2) : 30 + Math.round((done / Math.max(n, 1)) * 70);

  let status = "";
  if (err) status = "";
  else if (!info) status = secs < 3 ? "Loading preview…" : `Loading preview… ${secs}s`;
  else if (!allDone) status = `Loading page ${Math.min(done + 1, n)} of ${n}…`;

  return (
    <div className="v2-pv" role="dialog" aria-modal="true" aria-label={`Preview: ${title}`} onClick={onClose}>
      <div className="v2-pv-box" onClick={(e) => e.stopPropagation()}>
        <div className="v2-pv-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="v2-pv-title">Free preview</div>
            <div className="v2-pv-sub">
              {info ? `First ${n} of ${info.total_pages} pages` : title}
            </div>
          </div>
          <button ref={closeBtn} type="button" className="v2-pv-x" onClick={onClose} aria-label="Close preview">
            ✕
          </button>
        </div>

        {!err && !allDone && (
          <div className="v2-pv-progress" aria-live="polite">
            <div className="v2-pv-bar">
              <span style={{ width: `${pct}%` }} className={!info ? "busy" : ""} />
            </div>
            <div className="v2-pv-status">
              <span className="v2-pv-spin" aria-hidden="true" />
              {status}
            </div>
          </div>
        )}

        <div className="v2-pv-body" onContextMenu={(e) => e.preventDefault()}>
          {err && (
            <div className="v2-pv-err">
              <p>{err}</p>
              <button
                type="button"
                className="v2-btn v2-btn-gold"
                onClick={() => {
                  setInfo(null);
                  setAttempt((a) => a + 1);
                }}
              >
                Try again
              </button>
            </div>
          )}

          {!err && !info && (
            <div className="v2-pv-page v2-pv-wait">
              <span className="v2-pv-spin big" aria-hidden="true" />
              <b>Loading preview…</b>
              <small>Getting the first pages ready. Big books can take a few seconds the first time.</small>
            </div>
          )}

          {info &&
            Array.from({ length: n }, (_, i) => i + 1).map((p) => {
              const tries = failed[p] || 0;
              const again = `${tries}-${bust[p] || 0}`;
              const src = `${API_URL}/courses/${courseId}/preview/page/${p}?v=${info.v}${again !== "0-0" ? `&r=${again}` : ""}`;
              return (
                <div key={p} className={`v2-pv-page${loaded[p] ? " ok" : ""}`}>
                  {!loaded[p] && (
                    <div className="v2-pv-wait">
                      {tries < 3 && <span className="v2-pv-spin big" aria-hidden="true" />}
                      {tries >= 3 ? (
                        <>
                          <b>Couldn&apos;t load page {p}</b>
                          <button
                            type="button"
                            className="v2-mini gold"
                            onClick={() => {
                              setFailed((f) => ({ ...f, [p]: 0 }));
                              setBust((b) => ({ ...b, [p]: (b[p] || 0) + 1 }));
                            }}
                          >
                            Retry
                          </button>
                        </>
                      ) : (
                        <small>Loading page {p}…</small>
                      )}
                    </div>
                  )}
                  {tries < 3 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt={`Page ${p}`}
                      draggable={false}
                      // sab ek saath (max 5) — lazy rakhte to neeche wale scroll tak
                      // shuru hi nahi hote aur progress atki dikhti
                      loading="eager"
                      onLoad={() => setLoaded((l) => ({ ...l, [p]: true }))}
                      onError={() => setFailed((f) => ({ ...f, [p]: (f[p] || 0) + 1 }))}
                    />
                  )}
                </div>
              );
            })}

          {info && (
            <div className="v2-pv-end">
              <b>That&apos;s the end of the free preview.</b>
              <span>
                {Math.max(info.total_pages - n, 0)} more pages are waiting for you in the full book.
              </span>
            </div>
          )}
        </div>

        {onBuy && (
          <div className="v2-pv-foot">
            <button type="button" className="v2-btn v2-btn-gold" style={{ width: "100%" }} onClick={onBuy}>
              {buyLabel || "Buy Now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
