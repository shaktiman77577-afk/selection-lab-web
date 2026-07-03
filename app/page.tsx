"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout, User } from "@/lib/api";
import {
  getCourses,
  getBanners,
  Course,
  Banner,
  courseTitle,
  courseImage,
  bannerImage,
} from "@/lib/supabase";

const GOLD = "#FFAB00";
const BG = "#0d0b08";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";

const CATEGORIES = [
  { icon: "📚", label: "Free Courses" },
  { icon: "📝", label: "Mock Tests" },
  { icon: "🎬", label: "Videos" },
  { icon: "📄", label: "PYQs" },
  { icon: "📱", label: "Quiz (In App)" },
  { icon: "🎯", label: "My Learning" },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getUser());
    Promise.all([getCourses(), getBanners()]).then(([c, b]) => {
      setCourses(c);
      setBanners(b);
      setLoading(false);
    });
  }, []);

  function requireLogin(path?: string) {
    if (!user) router.push("/login");
    else if (path) router.push(path);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "inherit" }}>
      {/* ── Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "rgba(13,11,8,0.95)",
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(8px)",
        }}
      >
        <img
          src="/logo.png"
          alt="Selection Lab"
          style={{ width: 42, height: 42, objectFit: "contain" }}
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.1 }}>
            Selection <span style={{ color: GOLD }}>Lab</span>
          </div>
          <div style={{ fontSize: 11, color: "#9a917f" }}>Govt. Exam Preparation</div>
        </div>
        {user ? (
          <>
            <button onClick={() => router.push("/my-learning")} style={{ ...goldBtn, padding: "9px 14px", fontSize: 13 }}>
              My Learning
            </button>
            <button onClick={() => logoutAndRefresh()} style={ghostBtn}>
              {firstName(user)} ▾
            </button>
          </>
        ) : (
          <button onClick={() => router.push("/login")} style={goldBtn}>
            Login
          </button>
        )}
      </header>

      {/* ── Banners ── */}
      {banners.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            padding: "16px 16px 4px",
            scrollSnapType: "x mandatory",
          }}
        >
          {banners.map((b) => (
            <img
              key={b.id}
              src={bannerImage(b)}
              alt={b.title || "Banner"}
              style={{
                height: 150,
                borderRadius: 14,
                border: `1px solid ${BORDER}`,
                scrollSnapAlign: "start",
                flexShrink: 0,
                maxWidth: "88%",
                objectFit: "cover",
              }}
            />
          ))}
        </div>
      )}

      {/* ── Hero (shown when no banners yet) ── */}
      {!loading && banners.length === 0 && (
        <div
          style={{
            margin: 16,
            padding: "26px 20px",
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            background: `linear-gradient(135deg, ${CARD} 0%, #1d180f 100%)`,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.25 }}>
            Crack your <span style={{ color: GOLD }}>Government Exam</span>
          </div>
          <p style={{ color: "#b5ab97", fontSize: 14, margin: "8px 0 0" }}>
            Courses, mock tests, PYQs and daily quizzes — built for serious aspirants.
          </p>
        </div>
      )}

      {/* ── Popular Courses ── */}
      <Section title="Popular Courses">
        {loading ? (
          <p style={mutedText}>Loading courses...</p>
        ) : courses.length === 0 ? (
          <p style={mutedText}>Courses will appear here soon.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {courses.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/course/${c.id}`)}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {courseImage(c) ? (
                  <img
                    src={courseImage(c)}
                    alt={courseTitle(c)}
                    style={{ width: "100%", height: 96, objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: 96,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 30,
                      background: "#1d180f",
                    }}
                  >
                    📘
                  </div>
                )}
                <div style={{ padding: "10px 10px 12px" }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      lineHeight: 1.3,
                      minHeight: 35,
                      overflow: "hidden",
                    }}
                  >
                    {courseTitle(c)}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    {c.is_free || c.price === 0 ? (
                      <span style={{ color: "#5dd97c", fontWeight: 800, fontSize: 14 }}>FREE</span>
                    ) : (
                      <span style={{ color: GOLD, fontWeight: 800, fontSize: 14 }}>
                        ₹{c.price ?? "--"}
                      </span>
                    )}
                  </div>
                  {Number(c.recent_buyers) > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11.5, color: "#ff9c5b", fontWeight: 700 }}>
                      🔥 {c.recent_buyers} recently purchased
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Categories ── */}
      <Section title="Explore">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              onClick={() =>
                cat.label === "My Learning"
                  ? requireLogin("/my-learning")
                  : cat.label === "Mock Tests"
                  ? router.push("/mock-tests")
                  : requireLogin()
              }
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "16px 8px",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 26 }}>{cat.icon}</div>
              <div style={{ fontSize: 12.5, marginTop: 6, color: "#e8e2d5" }}>{cat.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Why Selection Lab ── */}
      <Section title="Why Selection Lab">
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { icon: "🛡", label: "Secure & Safe" },
            { icon: "👥", label: "Easy & Fast" },
            { icon: "🎖", label: "Trusted by Aspirants" },
          ].map((b) => (
            <div
              key={b.label}
              style={{
                flex: 1,
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "14px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22 }}>{b.icon}</div>
              <div style={{ fontSize: 12, marginTop: 6, color: "#cfc6b3" }}>{b.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer
        style={{
          marginTop: 28,
          padding: "22px 16px 30px",
          borderTop: `1px solid ${BORDER}`,
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <a href="https://t.me/Selection_Lab" target="_blank" style={footLink}>
            Telegram
          </a>
          <a href="https://t.me/englishbynikki07" target="_blank" style={footLink}>
            English by Nikki
          </a>
          <a href="/privacy" style={footLink}>
            Privacy Policy
          </a>
          <a href="/terms" style={footLink}>
            Terms
          </a>
        </div>
        <p style={{ color: "#7d7461", fontSize: 12, marginTop: 12 }}>
          © {new Date().getFullYear()} Selection Lab. All rights reserved.
        </p>
      </footer>
    </div>
  );

  function logoutAndRefresh() {
    logout();
    setUser(null);
  }
}

function firstName(u: User): string {
  return (u.name || "Account").split(" ")[0];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: "18px 16px 4px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>
        <span style={{ borderBottom: `3px solid ${GOLD}`, paddingBottom: 4 }}>{title}</span>
      </h2>
      {children}
    </section>
  );
}

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const mutedText: React.CSSProperties = { color: "#8d8371", fontSize: 14 };

const footLink: React.CSSProperties = {
  color: "#FFAB00",
  fontSize: 13,
  textDecoration: "none",
};
                
