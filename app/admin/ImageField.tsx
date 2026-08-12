"use client";

// ImageField — admin ka har image input isi se banta hai.
//
// Kyun: pehle sirf ek khaali box hota tha, isliye 2 MB ki galat size wali PNG
// upload ho jaati thi aur pata baad me chalta tha. Ab yahi field turant bata
// deta hai ki size sahi hai ya nahi, aur mobile + desktop dono ka preview
// dikha deta hai — crop kahan lagega wo aankhon se dikh jata hai.

import { useEffect, useState } from "react";

const GOLD = "#FFAB00";
const GREEN = "#5dd97c";
const RED = "#ff6b6b";
const BORDER = "rgba(255,255,255,0.12)";

type Info = {
  w: number;
  h: number;
  kb: number | null;
  loading: boolean;
  error: string;
};

export default function ImageField({
  label,
  value,
  onChange,
  reqW,
  reqH,
  where,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  reqW: number;
  reqH: number;
  where?: string;      // ye image site par kahan-kahan dikhegi
  hint?: string;
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const url = (value || "").trim();
  const reqRatio = reqW / reqH;

  useEffect(() => {
    const looksLikeUrl = url.startsWith("http://") || url.startsWith("https://");
    if (!looksLikeUrl) {
      setInfo(null);
      return;
    }
    let dead = false;
    setInfo({ w: 0, h: 0, kb: null, loading: true, error: "" });

    const img = new Image();
    img.onload = () => {
      if (dead) return;
      setInfo({ w: img.naturalWidth, h: img.naturalHeight, kb: null, loading: false, error: "" });
      // File size alag se — sab hosts HEAD support nahi karte, isliye chup-chaap
      fetch(url, { method: "HEAD" })
        .then((r) => {
          const len = r.headers.get("content-length");
          if (!dead && len) {
            setInfo((p) => (p ? { ...p, kb: Math.round(parseInt(len, 10) / 1024) } : p));
          }
        })
        .catch(() => {});
    };
    img.onerror = () => {
      if (!dead) setInfo({ w: 0, h: 0, kb: null, loading: false, error: "Image could not load — check the link" });
    };
    img.src = url;

    return () => {
      dead = true;
    };
  }, [url]);

  const ratio = info && info.h ? info.w / info.h : 0;
  const ratioOff = ratio ? Math.abs(ratio - reqRatio) / reqRatio : 0;
  const tooSmall = info ? info.w > 0 && info.w < reqW * 0.7 : false;
  const heavy = info?.kb ? info.kb > 400 : false;
  const perfect = info && !info.error && !tooSmall && ratioOff < 0.08 && !heavy;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: "#9a917f" }}>{label}</span>
        <span
          style={{
            fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: GOLD,
            background: "rgba(255,171,0,0.13)", border: `1px solid ${GOLD}55`,
            borderRadius: 6, padding: "2px 7px",
          }}
        >
          {reqW}×{reqH} px · JPEG · under 300 KB
        </span>
      </div>

      {where && (
        <div
          style={{
            fontSize: 11, color: "#8a8274", marginBottom: 7, lineHeight: 1.5,
            background: "rgba(255,255,255,0.035)", borderRadius: 8, padding: "7px 10px",
          }}
        >
          📍 <b style={{ color: "#c8c0ae" }}>Shows in:</b> {where}
        </div>
      )}

      <input
        style={{
          background: "rgba(255,255,255,0.05)", color: "#fff",
          border: `1px solid ${info?.error ? RED : perfect ? GREEN : BORDER}`,
          borderRadius: 10, padding: "12px 14px", fontSize: 14, width: "100%",
          boxSizing: "border-box", outline: "none",
        }}
        placeholder={`https://i.ibb.co/... (${reqW}×${reqH})`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />

      {hint && !url && (
        <div style={{ fontSize: 11, color: "#7a7263", marginTop: 5, lineHeight: 1.5 }}>{hint}</div>
      )}

      {info?.loading && (
        <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 6 }}>Checking image…</div>
      )}

      {info?.error && (
        <div style={{ fontSize: 11.5, color: RED, marginTop: 6 }}>⚠ {info.error}</div>
      )}

      {info && !info.loading && !info.error && (
        <>
          {/* Status line */}
          <div
            style={{
              display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
              fontSize: 11.5, marginTop: 7, fontWeight: 700,
              color: perfect ? GREEN : GOLD,
            }}
          >
            <span>{perfect ? "✓ Perfect size" : "⚠ Needs fixing"}</span>
            <span style={{ color: "#9a917f", fontWeight: 600 }}>
              {info.w}×{info.h} px · {ratio.toFixed(2)}:1
              {info.kb ? ` · ${info.kb} KB` : ""}
            </span>
          </div>

          {/* Kya-kya galat hai */}
          {!perfect && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11.5, color: "#c8c0ae", lineHeight: 1.65 }}>
              {tooSmall && (
                <li>
                  Too small — {info.w}px wide, needs {reqW}px. It will look blurry.
                </li>
              )}
              {ratioOff >= 0.08 && (
                <li>
                  Wrong shape — {ratio.toFixed(2)}:1 instead of {reqRatio.toFixed(2)}:1.
                  About {Math.round(ratioOff * 100)}% of the image gets cut (see preview below).
                </li>
              )}
              {heavy && (
                <li>
                  Too heavy — {info.kb} KB. Save as JPEG quality 80 to get under 300 KB.
                </li>
              )}
            </ul>
          )}

          {/* Preview — mobile aur desktop dono, taaki crop dikh jaye */}
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <Preview title="📱 Mobile card" url={url} w={150} ratio={reqRatio} />
            <Preview title="🖥️ Desktop card" url={url} w={240} ratio={reqRatio} />
          </div>

          {ratioOff >= 0.08 && (
            <div style={{ fontSize: 11, color: "#9a917f", marginTop: 6, lineHeight: 1.5 }}>
              Preview me jo hissa nahi dikh raha, wo students ko bhi nahi dikhega.
              Poora poster dikhana hai to image ko {reqW}×{reqH} me crop kar lijiye.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Preview({ title, url, w, ratio }: { title: string; url: string; w: number; ratio: number }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "#7a7263", marginBottom: 4 }}>{title}</div>
      <div
        style={{
          width: w, aspectRatio: String(ratio),
          borderRadius: 9, overflow: "hidden",
          border: `1px solid ${BORDER}`, background: "#000",
        }}
      >
        <img
          src={url}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    </div>
  );
}
