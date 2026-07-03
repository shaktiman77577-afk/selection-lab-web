"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import SideMenu from "@/app/components/SideMenu";
import { getCourses, Course, courseTitle, courseImage } from "@/lib/supabase";

const GOLD = "#FFAB00";
type Filter = "all" | "free" | "paid";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getCourses().then((c) => {
      setCourses(c);
      setLoading(false);
    });
  }, []);

  const shown = courses.filter((c: any) => {
    if (filter === "free" && Number(c.price) !== 0) return false;
    if (filter === "paid" && Number(c.price) === 0) return false;
    if (q && !courseTitle(c).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header
        style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--header)", borderBottom: "1px solid var(--line)" }}
      >
        <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}>
          ☰
        </button>
        <div style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>Courses</div>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "14px 16px 40px" }}>
        {/* Search */}
        <input
          placeholder="🔍 Search courses..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "var(--chip)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
            outline: "none",
          }}
        />

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, margin: "12px 0 16px" }}>
          {(["all", "free", "paid"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 18px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                border: `1px solid ${filter === f ? GOLD : "var(--line)"}`,
                background: filter === f ? GOLD : "var(--chip)",
                color: filter === f ? "#1a1a1a" : "var(--text)",
                textTransform: "capitalize",
              }}
            >
              {f === "all" ? "All" : f === "free" ? "Free" : "Paid"}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading courses...</p>
        ) : shown.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No courses found{q ? ` for "${q}"` : ""}. New courses launching soon!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12 }}>
            {shown.map((c: any) => (
              <div
                key={c.id}
                onClick={() => router.push(`/course/${c.id}`)}
                style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", cursor: "pointer", boxShadow: "var(--shadow)" }}
              >
                <div style={{ height: 92, background: "var(--chip)", overflow: "hidden" }}>
                  {courseImage(c) && <img src={courseImage(c)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, minHeight: 36, overflow: "hidden" }}>{courseTitle(c)}</div>
                  <div style={{ marginTop: 6, fontSize: 13.5 }}>
                    {Number(c.price) === 0 ? (
                      <b style={{ color: "#2e8b4a" }}>FREE</b>
                    ) : (
                      <>
                        <b style={{ color: GOLD }}>₹{c.price}</b>
                        {Number(c.original_price) > Number(c.price) && (
                          <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 11.5, marginLeft: 5 }}>₹{c.original_price}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
