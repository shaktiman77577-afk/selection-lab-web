"use client";

/**
 * Disclaimer.tsx — Tier 2 ke har hisse par lagne wali soochna.
 *
 * Alag file me isliye hai kyunki ise teen jagah se import kiya jata hai.
 * Next.js ke page.tsx se component export karna chalta to hai, par salah
 * nahi di jaati — build ke optimisation me dikkat aa sakti hai.
 *
 * Dono bhasha hamesha ek saath dikhti hain, toggle ke bina. Ye legal soochna
 * hai — koi ise dhoondh kar nahi padhta, isliye chhupana nahi chahiye.
 */

export default function Disclaimer({ compact }: { compact?: boolean }) {
  return (
    <div
      style={{
        background: "var(--chip)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: compact ? "10px 12px" : 13,
        marginTop: 14,
        fontSize: compact ? 11.5 : 12.5,
        color: "var(--muted)",
        lineHeight: 1.65,
      }}
    >
      <b style={{ color: "var(--text)" }}>This is practice material, not the actual exam.</b>{" "}
      The real exam screen, passage and marking may differ. Selection Lab is not connected with any
      court, commission or recruiting body. Practise the skill, not the screen.
      <div style={{ marginTop: 6 }}>
        <b style={{ color: "var(--text)" }}>यह अभ्यास सामग्री है, असली परीक्षा नहीं।</b>{" "}
        असली परीक्षा की स्क्रीन, पैसेज और अंक देने का तरीका अलग हो सकता है। Selection Lab का किसी कोर्ट,
        आयोग या भर्ती संस्था से कोई संबंध नहीं है। स्क्रीन नहीं, स्किल तैयार कीजिए।
      </div>
    </div>
  );
}
