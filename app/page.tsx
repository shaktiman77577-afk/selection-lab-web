"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, User } from "@/lib/api";
import ThemeToggle from "@/app/components/ThemeToggle";
import SideMenu from "@/app/components/SideMenu";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import LiveTestBanner from "@/app/components/LiveTestBanner";
import HomePoster from "@/app/components/HomePoster";
import SearchBox from "@/app/components/SearchBox";
import ExamCountdown from "@/app/components/ExamCountdown";
import Testimonials from "@/app/components/Testimonials";
import CommunitySection, { CommunityFloat } from "@/app/components/CommunityHub";
import { getCourses, getBanners, Course, Banner, courseTitle, courseImage, bannerImage } from "@/lib/supabase";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

const WHY = [
  { icon: "🖥️", title: "Real Exam Interface", desc: "Mock tests on the same TCS/SSC-pattern screen you'll face on exam day — palette, timer, sections, everything." },
  { icon: "🌐", title: "Hindi + English", desc: "Every question, option and explanation available in both languages. Switch anytime during the test." },
  { icon: "👩‍🏫", title: "Expert Guidance", desc: "Courses and strategy by Nikki Ma'am — trusted by thousands of aspirants on YouTube." },
  { icon: "💰", title: "Honest Pricing", desc: "Serious preparation shouldn't cost thousands. Full test series and courses at prices every aspirant can afford." },
];

const EXAMS = ["SSC CGL", "SSC CHSL", "IB Security Assistant", "Railways RRB", "UP Police SI", "Allahabad High Court", "CISF / CRPF", "UPSC CAPF"];

const FACULTY = [
  { name: "Nikki Ma'am", subject: "English & Interview", img: "/nikki_maam.png" },
  { name: "Ravi Sir", subject: "GK/GS & Current Affairs", img: "/ravi_sir.jpg" },
  { name: "Ashutosh Sir", subject: "Maths", img: "/ashutosh_sir.jpg" },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  // Phone par mobile banner, bade screen par desktop wala. Hero ka shape bhi
  // uske hisaab se badalta hai — warna wide patti phone par patli dikhti hai.
  const [narrow, setNarrow] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  // Bumping this restarts the auto-advance countdown, so a manual swipe/dot tap
  // isn't yanked away by a timer that was already half-way through.
  const [tick, setTick] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const didSwipe = useRef(false);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setUser(getUser());
    Promise.all([getCourses(), getBanners()]).then(([c, b]) => {
      setCourses(c);
      setBanners(b);
      setLoading(false);
    });
  }, []);

  // Slide ab sirf ek hi tarah ka: image (banner ya course poster).
  // Timer, dots aur swipe sab isi list se chalte hain.
  type HeroS = { kind: "image"; img: string; action: string; title: string };

  // Carousel me sirf wahi dikhega jo admin upload karta hai:
  // pehle Banners tab ke banners, phir Featured tick kiye hue courses ke poster.
  // App Content ke text slides yahan nahi aate — homepage saaf rehta hai.
  const slides: HeroS[] = [];

  for (const b of banners) {
    // placement = "poster" wale banners neeche HomePoster me jaate hain,
    // carousel me nahi — warna ek hi banner do jagah dikhta.
    if (((b as any).placement || "hero") === "poster") continue;
    // Phone par mobile image (agar di ho), warna desktop wali
    const mob = (b as any).image_url_mobile;
    const img = (narrow && mob) ? mob : bannerImage(b);
    if (!img) continue;
    const act = (b as any).link || (b as any).link_url || (b as any).redirect_url || "";
    slides.push({ kind: "image", img, action: String(act), title: b.title || "" });
  }

  for (const c of courses) {
    if (!(c as any).is_featured) continue;                 // sirf Featured tick wale
    if (((c as any).visible_on ?? "both") === "app") continue;
    // Phone par mobile thumbnail (agar di ho), warna desktop wali
    const cm = (c as any).thumbnail_url_mobile;
    const img = (narrow && cm) ? cm : courseImage(c);
    if (!img) continue;
    slides.push({ kind: "image", img, action: `/course/${c.id}`, title: "" });
  }

  // Slide actions: URLs open in a new tab, app-style routes push in-site.
  function heroGo(action: string) {
    const a = (action || "").trim();
    if (!a) return;
    if (a.startsWith("http")) window.open(a, "_blank");
    else if (a.startsWith("/")) router.push(a);
    else router.push("/" + a);
  }

  // Auto-advance hero carousel every 4s
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, tick]);

  // Jump to a slide and give the user a full 4s before auto-advance resumes.
  function goToSlide(i: number) {
    setSlide(i);
    setTick((n) => n + 1);
  }

  function onHeroTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    didSwipe.current = false;
  }

  function onHeroTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > 10) {
      didSwipe.current = true; // it's a drag, not a tap — don't open the link
    }
  }

  function onHeroTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || slides.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return; // too small — treat as a tap
    const dir = dx < 0 ? 1 : -1;   // swipe left → next slide
    goToSlide((slide + dir + slides.length) % slides.length);
  }

  // Platform visibility: app-only courses website pe nahi dikhte.
  const featured = courses
    .filter((c: any) => ((c as any).visible_on ?? "both") !== "app")
    .slice(0, 6);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── Announcement bar (admin app-config; same as app) ── */}
      <AnnouncementBar />

      {/* ── Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "var(--header)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}>
          ☰
        </button>
        <img src="/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "contain" }} />
        <div style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>
          Selection <span style={{ color: GOLD }}>Lab</span>
        </div>
        <ThemeToggle />
        {user ? (
          <button onClick={() => router.push("/my-learning")} style={{ ...goldBtn, padding: "9px 14px", fontSize: 13 }}>
            My Learning
          </button>
        ) : (
          <button onClick={() => router.push("/login")} style={{ ...goldBtn, padding: "9px 16px", fontSize: 13 }}>
            Login
          </button>
        )}
      </header>

      {/* ── Quick nav ── */}
      <nav style={{ display: "flex", gap: 18, padding: "10px 16px", overflowX: "auto", borderBottom: "1px solid var(--line)", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" }}>
        <a onClick={() => router.push("/courses")} style={navLink}>Courses</a>
        <a onClick={() => router.push("/mock-tests")} style={navLink}>Mock Tests</a>
        <a onClick={() => router.push("/descriptive")} style={navLink}>Descriptive</a>
        <a onClick={() => router.push("/tier2")} style={navLink}>Tier 2</a>
        <a onClick={() => router.push("/blog")} style={navLink}>Blog</a>
        <a onClick={() => router.push("/about")} style={navLink}>About</a>
        <a onClick={() => router.push("/contact")} style={navLink}>Contact</a>
        <a onClick={() => router.push("/support")} style={navLink}>Help</a>
      </nav>

      {/* ── Search ── */}
      <SearchBox />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* Live test banner — hero se alag, sabse upar */}
        <LiveTestBanner />

        {/* ── Hero carousel: banners + featured courses. Kuch na ho to default hero. ── */}
        {slides.length > 0 ? (
          <section
            onTouchStart={onHeroTouchStart}
            onTouchMove={onHeroTouchMove}
            onTouchEnd={onHeroTouchEnd}
            style={{
              position: "relative",
              borderRadius: 18,
              overflow: "hidden",
              aspectRatio: narrow ? "1 / 1" : "16 / 7",
              minHeight: 210,
              background: NAVY,
              touchAction: "pan-y", // vertical page scroll still works
            }}
          >
            {slides.map((s, i) => (
              <div
                key={i}
                onClick={() => {
                  if (didSwipe.current) {
                    didSwipe.current = false;
                    return; // that was a swipe, not a tap
                  }
                  heroGo(s.action);
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: i === slide ? 1 : 0,
                  transition: "opacity 0.6s ease",
                  cursor: "pointer",
                  pointerEvents: i === slide ? "auto" : "none",
                }}
              >
                    {/* Blurred copy peeche — poster ke aas-paas khali bars na dikhein */}
                    <img
                      src={s.img}
                      alt=""
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "blur(18px) brightness(0.6)",
                        transform: "scale(1.1)",
                      }}
                    />
                    {/* Asli poster — contain, taaki poora dikhe aur text kate nahi */}
                    <img
                      src={s.img}
                      alt={s.title || ""}
                      style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain" }}
                    />
              </div>
            ))}

            {/* Dots */}
            {slides.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "center",
                  gap: 7,
                  zIndex: 2,
                }}
              >
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSlide(i);
                    }}
                    aria-label={`Go to slide ${i + 1}`}
                    style={{
                      width: i === slide ? 22 : 8,
                      height: 8,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background: i === slide ? GOLD : "rgba(255,255,255,0.55)",
                      transition: "all 0.3s ease",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section
            style={{
              background: `linear-gradient(135deg, ${NAVY}, #2c4a85)`,
              borderRadius: 18,
              padding: "26px 20px",
              color: "#fff",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,171,0,0.15)" }} />
            <div style={{ position: "absolute", right: 40, bottom: -50, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <h1 style={{ margin: 0, fontSize: 25, lineHeight: 1.3, fontWeight: 800 }}>
              Crack SSC, IB &amp; Railway Exams
            </h1>
            <p style={{ margin: "10px 0 18px", fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", maxWidth: 480 }}>
              Courses, real exam-interface mock tests and daily practice — in <b>Hindi + English</b>, guided by Nikki Ma&apos;am.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => router.push("/mock-tests")} style={{ ...goldBtn, padding: "12px 20px" }}>
                🎯 Try Free Mock Test
              </button>
              <button
                onClick={() => router.push("/courses")}
                style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 10, padding: "12px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
              >
                Explore Courses
              </button>
            </div>
          </section>
        )}

        {/* ── Homepage poster (banners with placement = poster) ──
             Slider ke theek neeche — sabse pehli nazar yahin padti hai. ── */}
        <HomePoster />

        {/* ── Exam countdown ── */}
        <ExamCountdown />

        {/* ── Why Selection Lab ── */}
        <h2 style={h2}>Why Selection Lab?</h2>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)" }}>
          We&apos;re new — and that&apos;s exactly why we do things differently.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
          {WHY.map((w) => (
            <div key={w.title} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow)" }}>
              <div style={{ fontSize: 28 }}>{w.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14.5, margin: "8px 0 4px" }}>{w.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>{w.desc}</div>
            </div>
          ))}
        </div>


        {/* ── Meet our faculty ── */}
        <h2 style={h2}>Meet Our Faculty</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {FACULTY.map((f) => (
            <div
              key={f.name}
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 16,
                padding: 16,
                textAlign: "center",
                boxShadow: "var(--shadow)",
              }}
            >
              <img
                src={f.img}
                alt={f.name}
                style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", objectPosition: "top", border: `3px solid ${GOLD}`, background: "var(--chip)", margin: "0 auto" }}
              />
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 10 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, marginTop: 3 }}>{f.subject}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <a
            href="https://youtube.com/@selection_lab"
            target="_blank"
            style={{ display: "inline-block", background: "#ff0000", color: "#fff", borderRadius: 8, padding: "9px 18px", fontWeight: 800, fontSize: 12.5, textDecoration: "none" }}
          >
            ▶ Watch Free Classes on YouTube
          </a>
        </div>

        {/* ── Exams we cover ── */}
        <h2 style={h2}>Exams We Cover</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EXAMS.map((e) => (
            <span
              key={e}
              style={{ background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}
            >
              {e}
            </span>
          ))}
        </div>

        {/* ── Selection stories ── */}
        <Testimonials />

        {/* ── Featured courses ── */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={h2}>Featured Courses</h2>
          <a onClick={() => router.push("/courses")} style={{ color: GOLD, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            View all →
          </a>
        </div>
        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading courses...</p>
        ) : featured.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>New courses launching soon — join our Telegram for updates!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {featured.map((c: any) => (
              <div
                key={c.id}
                onClick={() => router.push(`/course/${c.id}`)}
                style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", cursor: "pointer", boxShadow: "var(--shadow)" }}
              >
                {/* Poster contain se dikhata hai (cover se upar ka text kat jata tha) */}
                <div style={{ position: "relative", width: "100%", aspectRatio: narrow ? "1 / 1" : "16 / 9", background: "var(--chip)", overflow: "hidden" }}>
                  {courseImage(c) && (
                    <>
                      <img
                        src={(narrow && (c as any).thumbnail_url_mobile) || courseImage(c)}
                        alt=""
                        aria-hidden
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(14px) brightness(0.7)", transform: "scale(1.1)" }}
                      />
                      <img
                        src={(narrow && (c as any).thumbnail_url_mobile) || courseImage(c)}
                        alt=""
                        style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                      />
                    </>
                  )}
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
                  {Number(c.recent_buyers) > 0 && (
                    <div style={{ fontSize: 10.5, color: "#e07b00", marginTop: 3 }}>🔥 {c.recent_buyers} students enrolled recently</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Mock test CTA ── */}
        <section
          style={{
            marginTop: 26,
            background: "var(--card)",
            border: `1.5px dashed ${GOLD}`,
            borderRadius: 16,
            padding: 18,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 34 }}>📝</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Experience the real exam — free</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
              Attempt free mock tests on the same interface as the actual SSC/TCS exam. No payment needed.
            </div>
          </div>
          <button onClick={() => router.push("/mock-tests")} style={goldBtn}>
            Start Now
          </button>
        </section>

        {/* ── Community (admin app-config; same links as app) ── */}
        <CommunitySection />

        {/* ── Partner program ──
             Footer ka link chhota pad jata hai. Jo log padha rahe hain unhe
             ye dikhna chahiye, aur unke liye alag block chahiye. ── */}
        <div
          onClick={() => router.push("/partner")}
          style={{
            marginTop: 26, borderRadius: 16, padding: "20px 18px", cursor: "pointer",
            background: "linear-gradient(135deg, #1a2f55, #2c4a85)", color: "#fff",
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Teach on YouTube or Telegram?</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>
              Share a coupon with your audience. They get a discount, you earn a share of every
              sale it brings.
            </div>
          </div>
          <span
            style={{
              background: GOLD, color: "#1a1a1a", borderRadius: 10,
              padding: "11px 18px", fontWeight: 800, fontSize: 13.5, whiteSpace: "nowrap",
            }}
          >
            Become a Partner
          </span>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--line)", padding: "22px 16px 30px", textAlign: "center", fontSize: 12.5, color: "var(--muted)" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>
          Selection <span style={{ color: GOLD }}>Lab</span>
        </div>
        <div style={{ margin: "6px 0 12px" }}>Your selection, our mission.</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <a href="/courses" style={footLink}>Courses</a>
          <a href="/mock-tests" style={footLink}>Mock Tests</a>
          <a href="/blog" style={footLink}>Blog</a>
          <a href="/about" style={footLink}>About</a>
          <a href="/contact" style={footLink}>Contact</a>
          <a href="/support" style={footLink}>Help &amp; Support</a>
          <a href="/privacy" style={footLink}>Privacy</a>
          <a href="/terms" style={footLink}>Terms</a>
          <a href="/partner" style={footLink}>Become a Partner</a>
        </div>
      </footer>

      {/* ── Floating community button ── */}
      <CommunityFloat />
    </div>
  );
}

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "11px 18px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const navLink: React.CSSProperties = { color: "var(--text)", cursor: "pointer" };

const h2: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: "26px 0 10px" };

const footLink: React.CSSProperties = { color: "var(--muted)", textDecoration: "none", fontWeight: 600 };

