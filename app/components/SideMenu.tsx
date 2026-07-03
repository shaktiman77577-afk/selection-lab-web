"use client";

import { useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/api";

const GOLD = "#FFAB00";

const MENU: { icon: string; label: string; path: string; auth?: boolean }[] = [
  { icon: "🏠", label: "Home", path: "/" },
  { icon: "📚", label: "Courses", path: "/courses" },
  { icon: "📝", label: "Mock Tests", path: "/mock-tests" },
  { icon: "🎯", label: "My Learning", path: "/my-learning", auth: true },
  { icon: "📱", label: "Quiz (In App)", path: "/" },
  { icon: "📰", label: "Blog", path: "/blog" },
  { icon: "ℹ️", label: "About Us", path: "/about" },
  { icon: "💬", label: "Contact & Support", path: "/contact" },
  { icon: "🔒", label: "Privacy Policy", path: "/privacy" },
  { icon: "📃", label: "Terms of Service", path: "/terms" },
];

export default function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  if (!open) return null;
  const user = getUser();

  function go(item: (typeof MENU)[number]) {
    onClose();
    if (item.auth && !user) {
      router.push("/login");
      return;
    }
    router.push(item.path);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 290,
          maxWidth: "84%",
          height: "100%",
          background: "var(--card)",
          color: "var(--text)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          boxShadow: "2px 0 18px rgba(0,0,0,0.25)",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px", borderBottom: "1px solid var(--line)" }}>
          <img src="/logo.png" alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>
              Selection <span style={{ color: GOLD }}>Lab</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Govt. Exam Preparation</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>
            ✕
          </button>
        </div>

        {/* User strip */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
          {user ? (
            <span>
              👋 Hi, <b>{user.name?.split(" ")[0] || "Student"}</b>
            </span>
          ) : (
            <button
              onClick={() => {
                onClose();
                router.push("/login");
              }}
              style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", width: "100%" }}
            >
              Login / Sign up
            </button>
          )}
        </div>

        {/* Menu items */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {MENU.map((m) => (
            <div
              key={m.label}
              onClick={() => go(m)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", borderBottom: "1px solid var(--line)" }}
            >
              <span style={{ fontSize: 18 }}>{m.icon}</span> {m.label}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
          {user && (
            <button
              onClick={() => {
                logout();
                onClose();
                window.location.href = "/";
              }}
              style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,107,107,0.5)", color: "#e05555", borderRadius: 8, padding: "10px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
            >
              Logout
            </button>
          )}
          <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted)", marginTop: 12 }}>
            © {new Date().getFullYear()} Selection Lab
          </div>
        </div>
      </div>
    </div>
  );
          }
