"use client";

/**
 * SearchBox.tsx — home page ka search.
 *
 * Poora page nahi kholta. Box wahin rehta hai, neeche dropdown khulta hai,
 * bahar tap ya Esc se band. Student ka page kahin nahi jata.
 *
 * DROPDOWN KI LAMBAI FIX NAHI HAI. Phone par keyboard aadhi screen le leta
 * hai; fix lambai rakhne par neeche ke result keyboard ke peechhe chhup jaate
 * hain. Isliye jitni jagah bachi ho, utni lete hain aur andar scroll.
 *
 * Ek akshar par hi result — do-teen akshar ka intezaar mobile par lamba
 * lagta hai. Har akshar par call nahi jaati: 250ms rukte hain, aur purani
 * call cancel kar dete hain warna dhima jawab naye jawab ko dhak deta hai.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";
const RECENT_KEY = "sl_recent_searches";

interface Result {
  kind: string;
  kind_label: string;
  id: any;
  title: string;
  subtitle?: string;
  price?: number;
  original_price?: number;
  thumbnail_url?: string;
  link: string;
}

interface Trend {
  label: string;
  query?: string;
  link?: string;
}

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [trending, setTrending] = useState<Trend[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [maxH, setMaxH] = useState(340);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timer = useRef<any>(null);
  const ctrl = useRef<AbortController | null>(null);

  // ── Trending aur recent ──
  useEffect(() => {
    fetch(`${API_URL}/search/trending`)
      .then((r) => r.json())
      .then((d) => setTrending(d?.trending || []))
      .catch(() => {});
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw).slice(0, 5));
    } catch {}
  }, []);

  function saveRecent(text: string) {
    const t = text.trim();
    if (!t) return;
    const next = [t, ...recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 5);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  }

  // ── Bahar tap se band ──
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  // ── Dropdown ke liye kitni jagah bachi hai ──
  // Keyboard khulne par window chhoti ho jaati hai, isliye har badlav par naapte hain.
  const measure = useCallback(() => {
    if (!wrapRef.current) return;
    const bottom = wrapRef.current.getBoundingClientRect().bottom;
    setMaxH(Math.max(180, window.innerHeight - bottom - 24));
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  // ── Search ──
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const text = q.trim();
    if (text.length < 1) { setResults([]); setBusy(false); return; }

    setBusy(true);
    timer.current = setTimeout(async () => {
      // Purani call cancel — warna dhima jawab naye jawab ko dhak deta hai
      if (ctrl.current) ctrl.current.abort();
      const c = new AbortController();
      ctrl.current = c;
      const uid = (getUser() as any)?.id;
      try {
        const r = await fetch(
          `${API_URL}/search/?q=${encodeURIComponent(text)}&platform=web${uid ? `&user_id=${uid}` : ""}`,
          { signal: c.signal }
        );
        const d = await r.json();
        setResults(d?.results || []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setResults([]);
      }
      setBusy(false);
    }, 250);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  function goTo(r: Result) {
    saveRecent(q);
    setOpen(false);
    router.push(r.link);
  }

  function useTrend(t: Trend) {
    if (t.link) { setOpen(false); router.push(t.link); return; }
    setQ(t.query || t.label);
    inputRef.current?.focus();
  }

  function seeAll() {
    const text = q.trim();
    if (!text) return;
    saveRecent(text);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(text)}`);
  }

  // Category ke hisaab se ikattha
  const groups: { label: string; items: Result[] }[] = [];
  for (const r of results.slice(0, 12)) {
    const g = groups.find((x) => x.label === r.kind_label);
    if (g) g.items.push(r);
    else groups.push({ label: r.kind_label, items: [r] });
  }
  const more = results.length - Math.min(results.length, 12);

  return (
    <div ref={wrapRef} style={{ position: "relative", padding: "10px 16px 0" }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--card)", border: `1px solid ${open ? GOLD : "var(--line)"}`,
          borderRadius: 12, padding: "0 12px", transition: "border-color 0.15s",
        }}
      >
        <span style={{ fontSize: 15, color: "var(--muted)" }}>🔎</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); measure(); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
            if (e.key === "Enter") seeAll();
          }}
          placeholder="Search courses, mocks, tests…"
          aria-label="Search"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            color: "var(--text)", fontSize: 14.5, padding: "12px 0", minWidth: 0,
          }}
        />
        {q && (
          <button
            onClick={() => { setQ(""); inputRef.current?.focus(); }}
            aria-label="Clear"
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 17, cursor: "pointer", padding: 4 }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute", left: 16, right: 16, top: "100%", marginTop: 6, zIndex: 60,
            background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)", overflowY: "auto", maxHeight: maxH,
          }}
        >
          {/* ── Kuch type nahi kiya ── */}
          {q.trim().length === 0 && (
            <div style={{ padding: 14 }}>
              {trending.length > 0 && (
                <>
                  <div style={label}>Trending</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: recent.length ? 14 : 0 }}>
                    {trending.map((t) => (
                      <button key={t.label} onClick={() => useTrend(t)} style={chip}>{t.label}</button>
                    ))}
                  </div>
                </>
              )}
              {recent.length > 0 && (
                <>
                  <div style={{ ...label, display: "flex", alignItems: "center" }}>
                    <span style={{ flex: 1 }}>Recent</span>
                    <button
                      onClick={() => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch {} }}
                      style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                    >
                      Clear
                    </button>
                  </div>
                  {recent.map((t) => (
                    <div key={t} onClick={() => { setQ(t); inputRef.current?.focus(); }} style={row}>
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>↩</span>
                      <span style={{ fontSize: 13.5 }}>{t}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Result ── */}
          {q.trim().length > 0 && (
            <>
              {busy && results.length === 0 && (
                <div style={{ padding: 16, fontSize: 13.5, color: "var(--muted)" }}>Searching…</div>
              )}

              {!busy && results.length === 0 && (
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 13.5, marginBottom: 10 }}>
                    No results for <b>{q.trim()}</b>
                  </div>
                  {trending.length > 0 && (
                    <>
                      <div style={label}>Try one of these</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {trending.map((t) => (
                          <button key={t.label} onClick={() => useTrend(t)} style={chip}>{t.label}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {groups.map((g) => (
                <div key={g.label}>
                  <div style={{ ...label, padding: "10px 14px 4px" }}>{g.label}</div>
                  {g.items.map((r) => (
                    <div key={`${r.kind}-${r.id}`} onClick={() => goTo(r)} style={{ ...row, padding: "9px 14px" }}>
                      {r.thumbnail_url ? (
                        <img src={r.thumbnail_url} alt="" style={{ width: 38, height: 26, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 38, height: 26, borderRadius: 5, background: "var(--chip)", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.title}
                        </div>
                        {r.subtitle && (
                          <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.subtitle}
                          </div>
                        )}
                      </div>
                      {Number(r.price) > 0 && (
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: GOLD, flexShrink: 0 }}>₹{r.price}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {results.length > 0 && (
                <div
                  onClick={seeAll}
                  style={{
                    padding: "11px 14px", borderTop: "1px solid var(--line)",
                    fontSize: 13, fontWeight: 700, color: GOLD, cursor: "pointer", textAlign: "center",
                  }}
                >
                  {more > 0 ? `See ${more} more results →` : "See all results →"}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: "var(--muted)",
  letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8,
};

const chip: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--line)", color: "var(--text)",
  borderRadius: 20, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 0", cursor: "pointer",
};
