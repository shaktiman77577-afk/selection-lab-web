"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";

const GOLD = "#FFAB00";

type Content = {
  id: number;
  title: string;
  content_type: string; // video | pdf
  url: string;
  display_order: number;
};

// Extract a YouTube video ID from any common URL format
function ytId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // Bare 11-char ID
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [owned, setOwned] = useState<boolean | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [items, setItems] = useState<Content[]>([]);
  const [active, setActive] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);

    (async () => {
      try {
        // Ownership check via my courses
        const mine = await fetch(`${API_URL}/courses/my/${u.id}`).then((r) => r.json());
        const myCourses = mine.courses || [];
        const found = myCourses.find((c: any) => Number(c.id) === courseId);
        setOwned(!!found);
        if (found) setCourseTitle(found.title || "");

        if (!found) {
          setLoading(false);
          return;
        }

        // Load content
        const res = await fetch(`${API_URL}/courses/${courseId}/content`).then((r) => r.json());
        const content: Content[] = res.content || [];
        setItems(content);
        setActive(content[0] || null);
      } catch (e: any) {
        setError(e.message || "Could not load course");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading)
    return (
      <Shell>
        <p style={{ padding: 24, color: "var(--muted)" }}>Loading...</p>
      </Shell>
    );

  if (owned === false)
    return (
      <Shell>
        <div style={{ padding: 40, textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontSize: 42 }}>🔒</div>
          <h2 style={{ fontSize: 19 }}>You don't own this course yet</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Purchase it to unlock all videos and study material.</p>
          <button onClick={() => router.push(`/course/${courseId}`)} style={goldBtn}>
            View course
          </button>
        </div>
      </Shell>
    );

  return (
    <Shell title={courseTitle}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 16px 40px" }}>
        {error && <div style={{ color: "#e05555", fontSize: 14, marginBottom: 12 }}>{error}</div>}

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            <div style={{ fontSize: 38 }}>📚</div>
            <p>Content is being added to this course. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Player area */}
            {active && (
              <div style={{ marginBottom: 16 }}>
                {active.content_type === "video" ? (
                  ytId(active.url) ? (
                    <div
                      onContextMenu={(e) => e.preventDefault()}
                      style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 14, overflow: "hidden", background: "#000" }}
                    >
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${ytId(active.url)}?rel=0&modestbranding=1&showinfo=0&controls=1&fs=1&disablekb=1&iv_load_policy=3`}
                        title={active.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                      />
                      {/* Cover ONLY the top-right corner where YouTube shows the
                          share, watch-later and channel/watch-on-YouTube links.
                          Center and bottom stay fully usable (play, seek, fullscreen). */}
                      <div
                        style={{ position: "absolute", top: 0, right: 0, width: 160, height: 66, zIndex: 6, background: "transparent" }}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                      {/* Cover the top-left title/channel link too */}
                      <div
                        style={{ position: "absolute", top: 0, left: 0, width: 200, height: 60, zIndex: 6, background: "transparent" }}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: 20, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14 }}>
                      <p style={{ fontSize: 14 }}>This video can't be embedded here.</p>
                      <a href={active.url} target="_blank" style={{ color: GOLD, fontWeight: 700 }}>Open video ↗</a>
                    </div>
                  )
                ) : (
                  <div style={{ padding: 24, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 40 }}>📄</div>
                    <div style={{ fontWeight: 700, fontSize: 15, margin: "8px 0 12px" }}>{active.title}</div>
                    <a
                      href={active.url}
                      target="_blank"
                      style={{ display: "inline-block", background: GOLD, color: "#1a1a1a", borderRadius: 10, padding: "11px 22px", fontWeight: 800, fontSize: 14, textDecoration: "none" }}
                    >
                      Open PDF ↗
                    </a>
                  </div>
                )}
                <h2 style={{ fontSize: 17, margin: "12px 0 0" }}>{active.title}</h2>
              </div>
            )}

            {/* Playlist */}
            <h3 style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 8px" }}>
              {items.length} {items.length === 1 ? "item" : "items"}
            </h3>
            {items.map((it, i) => {
              const isActive = active?.id === it.id;
              return (
                <div
                  key={it.id}
                  onClick={() => setActive(it)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    marginBottom: 8,
                    cursor: "pointer",
                    background: isActive ? "rgba(255,171,0,0.1)" : "var(--card)",
                    border: `1px solid ${isActive ? GOLD : "var(--line)"}`,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{it.content_type === "pdf" ? "📄" : "▶️"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {i + 1}. {it.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{it.content_type === "pdf" ? "PDF" : "Video"}</div>
                  </div>
                  {isActive && <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>Playing</span>}
                </div>
              );
            })}
          </>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, title }: { children: React.ReactNode; title?: string }) {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--header)", borderBottom: "1px solid var(--line)" }}>
        <button onClick={() => router.push("/my-learning")} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text)" }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 15, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title || "My Course"}
        </div>
      </header>
      {children}
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
  marginTop: 12,
};
