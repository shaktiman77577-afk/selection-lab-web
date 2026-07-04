"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";

const GOLD = "#FFAB00";

// Loads the YouTube IFrame API once
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).YT && (window as any).YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => resolve();
  });
  return ytApiPromise;
}

function fmtTime(s: number): string {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

function YouTubeLocked({ id }: { id: string }) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<any>(null);
  const divId = `ytp_${id}`;

  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled) return;
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(divId, {
        videoId: id,
        playerVars: {
          rel: 0, modestbranding: 1, showinfo: 0, controls: 0,
          disablekb: 1, fs: 0, iv_load_policy: 3, playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            setReady(true);
            setDuration(e.target.getDuration() || 0);
          },
          onStateChange: (e: any) => {
            const st = e.data;
            setPlaying(st === YT.PlayerState.PLAYING);
            if (st === YT.PlayerState.PLAYING && !duration) {
              setDuration(playerRef.current?.getDuration?.() || 0);
            }
          },
        },
      });
    });

    // Poll current time every 500ms
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p && p.getCurrentTime && !seeking) {
        setCurrent(p.getCurrentTime() || 0);
        if (!duration && p.getDuration) setDuration(p.getDuration() || 0);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
      try { playerRef.current?.destroy?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value);
    setCurrent(t);
  }
  function onSeekStart() { setSeeking(true); }
  function onSeekEnd(e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent | React.TouchEvent) {
    const p = playerRef.current;
    const t = (e as any).target ? Number((e as any).target.value) : current;
    if (p?.seekTo) p.seekTo(t, true);
    setSeeking(false);
  }

  function setPlaybackSpeed(s: number) {
    const p = playerRef.current;
    if (p?.setPlaybackRate) p.setPlaybackRate(s);
    setSpeed(s);
    setShowSpeed(false);
  }

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#000", userSelect: "none" }}
    >
      {/* Video area */}
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
        <div id={divId} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />

        {/* Full transparent overlay — blocks ALL YouTube UI; tap = play/pause */}
        <button
          onClick={togglePlay}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            zIndex: 5, background: "transparent", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <span
            style={{
              width: 62, height: 62, borderRadius: "50%", background: "rgba(0,0,0,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, color: "#fff", opacity: playing ? 0 : 1, transition: "opacity 0.2s",
            }}
          >
            ▶
          </span>
        </button>

        {!ready && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 13, zIndex: 4 }}>
            Loading…
          </div>
        )}
      </div>

      {/* Custom control bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#111", zIndex: 6, position: "relative" }}>
        <button
          onClick={togglePlay}
          style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", width: 26, flexShrink: 0 }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <span style={{ color: "#ccc", fontSize: 11.5, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {fmtTime(current)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={onSeek}
          onMouseDown={onSeekStart}
          onTouchStart={onSeekStart}
          onMouseUp={onSeekEnd as any}
          onTouchEnd={onSeekEnd as any}
          style={{ flex: 1, accentColor: GOLD, height: 4, cursor: "pointer" }}
        />

        <span style={{ color: "#ccc", fontSize: 11.5, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {fmtTime(duration)}
        </span>

        {/* Speed */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setShowSpeed((v) => !v)}
            style={{ background: "none", border: "1px solid #444", color: "#fff", fontSize: 11.5, fontWeight: 700, borderRadius: 6, padding: "3px 7px", cursor: "pointer", minWidth: 38 }}
          >
            {speed}x
          </button>
          {showSpeed && (
            <div style={{ position: "absolute", bottom: "120%", right: 0, background: "#1c1c1c", border: "1px solid #333", borderRadius: 8, overflow: "hidden", zIndex: 20 }}>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  style={{
                    display: "block", width: 60, textAlign: "center", padding: "8px 0",
                    background: s === speed ? "rgba(255,171,0,0.15)" : "transparent",
                    color: s === speed ? GOLD : "#fff", border: "none",
                    fontSize: 12.5, fontWeight: s === speed ? 800 : 500, cursor: "pointer",
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



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
                    <YouTubeLocked id={ytId(active.url)!} />
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
