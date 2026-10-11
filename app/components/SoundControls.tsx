"use client";

/**
 * SoundControls — typing screen ka 🔈 Sound button + chhota panel.
 * Key sound aur Room sound, dono ka apna On/Off aur volume. Default dono OFF.
 * Asli kaam lib/typingSound.ts me hota hai; ye sirf switch aur slider hai.
 *
 * `light` — typing test ki screen hamesha safed hai (dark theme me bhi), wahan
 * site ke CSS variables nahi chalte.
 */
import { useEffect, useRef, useState } from "react";
import {
  getSoundSettings, subscribeSound, updateSoundSettings, type SoundSettings,
} from "@/lib/typingSound";

const GOLD = "#FFAB00";

export default function SoundControls({ light = false, align = "right", onClose }: {
  light?: boolean;
  align?: "left" | "right";   // panel button ke kis kinare se khule (screen se bahar na jaaye)
  onClose?: () => void;
}) {
  const [s, setS] = useState<SoundSettings | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // localStorage sirf browser me — pehle render me kuch nahi (hydration safe)
  useEffect(() => {
    setS(getSoundSettings());
    return subscribeSound(setS);
  }, []);

  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    function esc(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    onClose?.();
  }

  const c = light
    ? { bg: "#fff", text: "#111", muted: "#5f6a7d", line: "#c7ccd6", chip: "#eef1f6" }
    : { bg: "var(--card)", text: "var(--text)", muted: "var(--muted)", line: "var(--line)", chip: "var(--chip)" };

  const anyOn = !!s && (s.keys || s.room);

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", display: "inline-block" }}
      // Drill page poore box par click se typing box focus karta hai — panel ke
      // click wahan tak na jaayen
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label="Sound settings"
        style={{
          height: 26, padding: "0 9px", borderRadius: 6, cursor: "pointer",
          border: `1px solid ${anyOn ? GOLD : c.line}`,
          background: anyOn ? "rgba(255,171,0,0.14)" : c.bg,
          color: c.text, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5,
        }}
      >
        <span aria-hidden>{anyOn ? "🔊" : "🔇"}</span> Sound
      </button>

      {open && s && (
        <div
          role="dialog"
          aria-label="Sound settings"
          style={{
            position: "absolute", top: "calc(100% + 6px)", zIndex: 60,
            ...(align === "left" ? { left: 0 } : { right: 0 }),
            width: 260, maxWidth: "calc(100vw - 32px)", boxSizing: "border-box",
            background: c.bg, color: c.text, border: `1px solid ${c.line}`, borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: 12, textAlign: "left",
          }}
        >
          <Row
            label="Key sound"
            sub="A click on every key you press."
            on={s.keys}
            onToggle={() => updateSoundSettings({ keys: !s.keys })}
            vol={s.keysVol}
            onVol={(v) => updateSoundSettings({ keysVol: v })}
            c={c}
          />
          <div style={{ height: 1, background: c.line, margin: "12px 0", opacity: 0.6 }} />
          <Row
            label="Room sound"
            sub="Other candidates typing, the fan and traffic outside — like a real exam hall."
            on={s.room}
            onToggle={() => updateSoundSettings({ room: !s.room })}
            vol={s.roomVol}
            onVol={(v) => updateSoundSettings({ roomVol: v })}
            c={c}
          />
          <div style={{ fontSize: 10.5, color: c.muted, marginTop: 10, lineHeight: 1.5 }}>
            Sounds do not change your timer or score. Use headphones for the best effect.
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, sub, on, onToggle, vol, onVol, c }: {
  label: string; sub: string; on: boolean; onToggle: () => void;
  vol: number; onVol: (v: number) => void;
  c: { bg: string; text: string; muted: string; line: string; chip: string };
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{label}</div>
          <div style={{ fontSize: 10.5, color: c.muted, lineHeight: 1.45, marginTop: 1 }}>{sub}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          onClick={onToggle}
          style={{
            width: 40, height: 22, borderRadius: 22, border: "none", cursor: "pointer", flexShrink: 0,
            background: on ? GOLD : c.line, position: "relative", padding: 0, transition: "background 0.15s",
          }}
        >
          <span style={{
            position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: 18,
            background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.15s",
          }} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, opacity: on ? 1 : 0.45 }}>
        <span aria-hidden style={{ fontSize: 11, color: c.muted }}>Volume</span>
        <input
          type="range" min={0} max={100} step={1}
          value={Math.round(vol * 100)}
          disabled={!on}
          aria-label={`${label} volume`}
          onChange={(e) => onVol(Number(e.target.value) / 100)}
          style={{ flex: 1, accentColor: GOLD, cursor: on ? "pointer" : "default" }}
        />
        <span style={{ fontSize: 11, color: c.muted, width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {Math.round(vol * 100)}
        </span>
      </div>
    </div>
  );
}
