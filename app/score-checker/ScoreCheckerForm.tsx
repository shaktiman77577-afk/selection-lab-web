"use client";

// Score checker ka form — link ya saved file, dono se.
//
// FILE WALA OPTION ZARURI HAI, optional nahi:
// digialm par bot protection hai aur server se fetch kabhi-kabhi block ho
// jaata hai. Aise me user page save karke yahan daal deta hai aur kaam ho
// jaata hai. Isiliye link fail hone par hum apne aap file wale tab par bhej
// dete hain — user ko sochna nahi padta ki ab kya karein.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import AdBanner from "@/app/components/AdBanner";

const GOLD = "#FFAB00";

const CATEGORIES = ["UR", "OBC", "EWS", "SC", "ST"];
const HORIZONTAL = ["None", "Ex-Serviceman", "OH", "VH", "HH", "Other PwD"];
const GENDERS = ["Male", "Female", "Other"];
const LANGUAGES = ["English", "Hindi", "Other"];

export default function ScoreCheckerForm() {
  const router = useRouter();

  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [category, setCategory] = useState("");
  const [horizontal, setHorizontal] = useState("");
  const [gender, setGender] = useState("");
  const [state, setState] = useState("");
  const [language, setLanguage] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");

    if (!category) {
      setError("Choose your category first — your rank is calculated within it.");
      return;
    }
    if (mode === "url" && !url.trim()) {
      setError("Paste your response sheet link.");
      return;
    }
    if (mode === "file" && !file) {
      setError("Choose the saved response sheet file.");
      return;
    }

    setBusy(true);
    try {
      let res: Response;

      if (mode === "url") {
        res = await fetch(`${API_URL}/score-checker/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            category,
            horizontal: horizontal || null,
            gender: gender || null,
            state: state.trim() || null,
            paper_language: language || null,
          }),
        });
      } else {
        const fd = new FormData();
        fd.append("file", file as File);
        fd.append("category", category);
        if (horizontal) fd.append("horizontal", horizontal);
        if (gender) fd.append("gender", gender);
        if (state.trim()) fd.append("state", state.trim());
        if (language) fd.append("paper_language", language);
        res = await fetch(`${API_URL}/score-checker/submit-file`, {
          method: "POST",
          body: fd,
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 502 matlab link khul nahi paaya — file wala rasta hi bacha hai
        if (res.status === 502 && mode === "url") {
          setMode("file");
          setError(
            (data.detail || "That link could not be opened.") +
              " Open the sheet in your browser, save the page, and upload it here."
          );
        } else {
          setError(data.detail || `Something went wrong (${res.status}).`);
        }
        return;
      }

      router.push(`/score-checker/result/${data.token}`);
    } catch (e: any) {
      setError(`Cannot reach the server. ${e?.message || ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={headerStyle}>
        <button onClick={() => router.push("/")} style={backBtn} aria-label="Back to home">
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 17 }}>
          Score <span style={{ color: GOLD }}>Checker</span>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <AdBanner placement="score_checker_top" />

        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 8px", lineHeight: 1.3 }}>
          Check your marks from the official answer key
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
          Paste the response sheet link from the exam website. Your score, section
          split and a question-wise review come back instantly.
        </p>

        {/* Mode switch */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["url", "file"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                background: mode === m ? GOLD : "var(--chip)",
                color: mode === m ? "#1a1408" : "var(--text)",
                border: `1px solid ${mode === m ? GOLD : "var(--line)"}`,
              }}
            >
              {m === "url" ? "By link" : "By saved file"}
            </button>
          ))}
        </div>

        <div style={cardStyle}>
          {mode === "url" ? (
            <Field label="Response sheet link">
              <input
                style={inputStyle}
                placeholder="https://cdn3.digialm.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
              />
              <Hint>Open your response sheet, copy the address from the browser, paste it here.</Hint>
            </Field>
          ) : (
            <Field label="Saved response sheet file">
              <input
                type="file"
                accept=".html,.htm,text/html"
                style={{ ...inputStyle, padding: 10 }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Hint>
                In your browser, open the sheet and choose Save page. Then pick that
                .html file here.
              </Hint>
            </Field>
          )}

          <Field label="Category">
            <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Choose your category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Gender" style={{ flex: 1 }}>
              <select style={inputStyle} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Optional</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Paper language" style={{ flex: 1 }}>
              <select style={inputStyle} value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="">Optional</option>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Horizontal category" style={{ flex: 1 }}>
              <select
                style={inputStyle}
                value={horizontal}
                onChange={(e) => setHorizontal(e.target.value)}
              >
                <option value="">Optional</option>
                {HORIZONTAL.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="State" style={{ flex: 1 }}>
              <input
                style={inputStyle}
                placeholder="Optional"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </Field>
          </div>

          <button
            onClick={submit}
            disabled={busy}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "13px 16px",
              borderRadius: 12,
              border: "none",
              background: busy ? "var(--chip)" : GOLD,
              color: busy ? "var(--muted)" : "#1a1408",
              fontWeight: 800,
              fontSize: 15,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "Reading your sheet..." : "Check my score"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "rgba(255,107,107,0.08)",
                border: "1px solid rgba(255,107,107,0.35)",
                color: "#ff8a8a",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.6, marginTop: 16 }}>
          Your name and roll number are read from the sheet so we can match repeat
          submissions. Rankings are shown anonymously.
        </p>
      </main>
    </div>
  );
}

// ── chhote UI helpers ───────────────────────────────────────────────────────
function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  background: "var(--header)",
  borderBottom: "1px solid var(--border)",
};

const backBtn: React.CSSProperties = {
  background: "var(--chip)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  width: 34,
  height: 34,
  fontSize: 16,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 10,
  background: "var(--chip)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  fontSize: 14,
  outline: "none",
};
