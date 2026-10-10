"use client";

// My Learning - website redesign (Oct 2026).
// Naya look (header, sections, laptop par 2-3 column). Data lane ka logic
// purane page jaisa hi: courses, mock series, descriptive series, live results.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { IconBook, IconChart, IconMock, IconPen, IconRight } from "@/app/components/v2/Icons";

export default function MyLearningPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [mockSeries, setMockSeries] = useState<any[]>([]);
  const [descSeries, setDescSeries] = useState<any[]>([]);
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

    // Mock series jo kharidi hui hain
    fetch(`${API_URL}/mock-tests/series?platform=web&user_id=${u.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMockSeries((d?.series || []).filter((s: any) => s.is_purchased)))
      .catch(() => {});

    // Descriptive series jo kharidi hui hain
    fetch(`${API_URL}/descriptive/series?platform=web&user_id=${u.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDescSeries((d?.series || []).filter((s: any) => s.is_purchased)))
      .catch(() => {});

    // Purane live tests — result kabhi bhi yahan se dekh sakte hain
    fetch(`${API_URL}/mock-tests/my-live-results?user_id=${u.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLiveResults(d?.results || []))
      .catch(() => {});
  }, [router]);

  function fmtDate(iso?: string) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return null;
    }
  }

  const nothing = !loading && courses.length === 0 && liveResults.length === 0 && mockSeries.length === 0 && descSeries.length === 0;
  const first = String(user?.name || "").trim().split(" ")[0];

  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <div style={{ paddingTop: 18 }}>
          <h1 className="v2-h1">My Learning</h1>
          <p className="v2-sub">{first ? `Hi ${first} — ` : ""}everything you have enrolled in, in one place.</p>
        </div>

        {loading && (
          <div className="v2-grid v2-grid-1" style={{ marginTop: 22 }} aria-hidden="true">
            {[0, 1, 2].map((k) => (
              <div key={k} className="v2-skel" style={{ height: 88, borderRadius: 14 }} />
            ))}
          </div>
        )}

        {nothing && (
          <div className="v2-empty">
            <IconBook size={44} />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "14px 0 6px", color: "var(--text)" }}>Nothing here yet</h2>
            <p style={{ margin: "0 0 20px" }}>Enroll in a course or test series to start your preparation.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/courses" className="v2-btn v2-btn-gold">
                Browse courses
              </Link>
              <Link href="/mock-tests" className="v2-btn" style={{ border: "1px solid var(--v2-line2)" }}>
                Free mock tests
              </Link>
            </div>
          </div>
        )}

        {courses.length > 0 && (
          <section className="v2-sec">
            <div className="v2-head">
              <h2 className="v2-h2">My courses</h2>
            </div>
            <div className="v2-grid v2-grid-1">
              {courses.map((c) => (
                <Link key={c.id} href={`/learn/${c.id}`} className="v2-row" style={{ marginTop: 0, padding: 12 }}>
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt="" loading="lazy" style={{ width: 96, height: 60, objectFit: "contain", background: "var(--v2-chip)" }} />
                  ) : (
                    <span style={{ width: 96, height: 60, borderRadius: 8, background: "var(--v2-chip)", display: "grid", placeItems: "center", flex: "none", color: "var(--v2-muted)" }}>
                      <IconBook />
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t" style={{ fontSize: 14.5 }}>{c.title}</div>
                    <div style={{ marginTop: 5, fontSize: 12.5, color: "var(--v2-green)", fontWeight: 700 }}>✓ Enrolled</div>
                    {fmtDate(c.expires_at) && <div style={{ fontSize: 12, color: "var(--v2-muted)", marginTop: 2 }}>Valid till {fmtDate(c.expires_at)}</div>}
                  </div>
                  <IconRight size={18} />
                </Link>
              ))}
            </div>
            <p className="v2-sub" style={{ marginTop: 14 }}>
              You can also watch your course videos in the Selection Lab app with the same account.
            </p>
          </section>
        )}

        {mockSeries.length > 0 && (
          <section className="v2-sec">
            <div className="v2-head">
              <h2 className="v2-h2">Mock test series</h2>
            </div>
            <div className="v2-grid v2-grid-1">
              {mockSeries.map((s) => (
                <Link key={s.id} href={`/mock-tests/${s.id}`} className="v2-row" style={{ marginTop: 0 }}>
                  <span className="v2-tile-ic" style={{ flex: "none" }}>
                    <IconMock />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{s.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--v2-green)", marginTop: 3, fontWeight: 700 }}>✓ Purchased · {s.tests_count || 0} tests</div>
                  </div>
                  <IconRight size={18} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {descSeries.length > 0 && (
          <section className="v2-sec">
            <div className="v2-head">
              <h2 className="v2-h2">Descriptive series</h2>
            </div>
            <div className="v2-grid v2-grid-1">
              {descSeries.map((s) => (
                <Link key={s.id} href={`/descriptive/${s.id}`} className="v2-row" style={{ marginTop: 0 }}>
                  <span className="v2-tile-ic" style={{ flex: "none" }}>
                    <IconPen />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{s.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--v2-green)", marginTop: 3, fontWeight: 700 }}>✓ Purchased · {s.test_count || 0} tests</div>
                  </div>
                  <IconRight size={18} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Live test results — publish hone ke baad kabhi bhi dekh sakte hain */}
        {liveResults.length > 0 && (
          <section className="v2-sec">
            <div className="v2-head">
              <h2 className="v2-h2">Live test results</h2>
            </div>
            <div className="v2-grid v2-grid-1">
              {liveResults.map((r) => (
                <div key={r.mock_test_id} className="v2-row" style={{ marginTop: 0, alignItems: "flex-start", opacity: r.results_published ? 1 : 0.8 }}>
                  <span className="v2-tile-ic" style={{ flex: "none" }}>
                    <IconChart />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{r.title}</div>
                    <div style={{ fontSize: 12.5, marginTop: 3, color: r.results_published ? "var(--v2-green)" : "var(--v2-muted)", fontWeight: r.results_published ? 700 : 500 }}>
                      {r.results_published ? `Score ${r.score}${r.total_marks ? ` / ${r.total_marks}` : ""}` : "Result awaited — we will publish it soon"}
                      {r.live_start_at ? ` · ${fmtDate(r.live_start_at)}` : ""}
                    </div>
                    {r.results_published && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <Link href={`/mock-test/${r.mock_test_id}/result`} className="v2-mini gold" style={{ display: "inline-flex", alignItems: "center" }}>
                          Result &amp; Rank
                        </Link>
                        <Link href={`/mock-test/${r.mock_test_id}?review=1`} className="v2-mini" style={{ display: "inline-flex", alignItems: "center" }}>
                          Solutions
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
