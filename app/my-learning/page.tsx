"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";

const GOLD = "#FFAB00";
const BG = "var(--bg)";
const CARD = "var(--card)";
const BORDER = "rgba(255,171,0,0.25)";

export default function MyLearningPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    fetch(`${API_URL}/courses/my/${u.id}`)
      .then((r) => r.json())
      .then((d) => setCourses(d.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function fmtDate(iso?: string) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return null;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "var(--text)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "var(--header)",
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(8px)",
        }}
      >
        <button onClick={() => router.push("/")} style={ghostBtn}>
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          My <span style={{ color: GOLD }}>Learning</span>
        </div>
      </header>

      <div style={{ padding: 16 }}>
        {loading && <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading your courses...</p>}

        {!loading && courses.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 44 }}>📚</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "14px 0 6px" }}>No courses yet</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px" }}>
              Enroll in a course to start your preparation.
            </p>
            <button onClick={() => router.push("/")} style={goldBtn}>
              Browse courses
            </button>
          </div>
        )}

        {courses.map((c) => (
          <div
            key={c.id}
            onClick={() => router.push(`/learn/${c.id}`)}
            style={{
              display: "flex",
              gap: 12,
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: 12,
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            {c.thumbnail_url ? (
              <img
                src={c.thumbnail_url}
                alt=""
                style={{ width: 92, height: 64, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 92,
                  height: 64,
                  borderRadius: 10,
                  background: "#221d13",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                📘
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.35 }}>{c.title}</div>
              <div style={{ marginTop: 5, fontSize: 12, color: "#5dd97c", fontWeight: 700 }}>✓ Enrolled</div>
              {fmtDate(c.expires_at) && (
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                  Valid till {fmtDate(c.expires_at)}
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && courses.length > 0 && (
          <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", marginTop: 18, lineHeight: 1.6 }}>
            📱 Watch your course videos and content in the Selection Lab app with the same account.
          </p>
        )}
      </div>
    </div>
  );
}

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "12px 22px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--text)",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "7px 12px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
      
