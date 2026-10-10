// Home page - website redesign (Oct 2026)
//
// Pehle ye poora browser me banta tha: page khulta, phir courses/banners
// mangta - isliye pehle "Loading..." aur Google ko khaali page. Ab server par
// data ke saath banta hai (60 sec cache), aur sirf chalne wale hisse
// (carousel, search, live test, login button) browser me chalte hain.
//
// Rang wahi gold/beige; laptop par poora top menu aur 4-column grid.
import Link from "next/link";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import HeroCarousel, { type Slide } from "@/app/components/v2/HeroCarousel";
import ProductCard from "@/app/components/v2/ProductCard";
import {
  AnnouncementBar,
  SearchBox,
  LiveTestBanner,
  HomePoster,
  ExamCountdown,
  Testimonials,
  CommunitySection,
  CommunityFloat,
} from "@/app/components/v2/legacy";
import {
  IconMock,
  IconPen,
  IconKeyboard,
  IconBook,
  IconNews,
  IconChart,
  IconScreen,
  IconGlobe,
  IconUser,
  IconTag,
  IconPlay,
} from "@/app/components/v2/Icons";
import { getCoursesServer, getBannersServer, getFeaturedSeriesServer } from "@/lib/serverApi";
import { courseImage, courseTitle, bannerImage } from "@/lib/supabase";

export const revalidate = 60;

const TILES = [
  { href: "/mock-tests", title: "Mock Tests", desc: "Real exam interface", Icon: IconMock },
  { href: "/descriptive", title: "Descriptive", desc: "Essay, letter, précis", Icon: IconPen },
  { href: "/tier2", title: "Typing / Skill", desc: "Typing, Excel, Word", Icon: IconKeyboard },
  { href: "/courses", title: "Courses", desc: "Video classes, notes", Icon: IconBook },
  { href: "/blog", title: "Blog", desc: "Exam news and tips", Icon: IconNews },
  { href: "/score-checker", title: "Score Checker", desc: "Your score and rank", Icon: IconChart },
];

const WHY = [
  { Icon: IconScreen, title: "Real Exam Interface", desc: "Mock tests on the same TCS/SSC-pattern screen you'll face on exam day — palette, timer, sections, everything." },
  { Icon: IconGlobe, title: "Hindi + English", desc: "Every question, option and explanation available in both languages. Switch anytime during the test." },
  { Icon: IconUser, title: "Expert Guidance", desc: "Courses and strategy by Nikki Ma'am — trusted by thousands of aspirants on YouTube." },
  { Icon: IconTag, title: "Honest Pricing", desc: "Serious preparation shouldn't cost thousands. Full test series and courses at prices every aspirant can afford." },
];

const EXAMS = ["SSC CGL", "SSC CHSL", "IB Security Assistant", "Railways RRB", "UP Police SI", "Allahabad High Court", "CISF / CRPF", "UPSC CAPF"];

const FACULTY = [
  { name: "Nikki Ma'am", subject: "English & Interview", img: "/nikki_maam.png" },
  { name: "Ravi Sir", subject: "GK/GS & Current Affairs", img: "/ravi_sir.jpg" },
  { name: "Ashutosh Sir", subject: "Maths", img: "/ashutosh_sir.jpg" },
];

// Banner ka link: "http..." naye tab me, "/..." site ke andar, khaali = koi link nahi
function hrefOf(action: unknown): string {
  const a = String(action ?? "").trim();
  if (!a) return "";
  if (/^https?:/i.test(a) || a.startsWith("/")) return a;
  return "/" + a;
}

export default async function HomePage() {
  const [courses, banners, featuredSeries] = await Promise.all([getCoursesServer(), getBannersServer(), getFeaturedSeriesServer()]);
  const webCourses = courses.filter((c: any) => (c.visible_on ?? "both") !== "app");

  // Carousel: pehle admin ke banners ("poster" wale neeche HomePoster me jaate
  // hain), phir Featured tick wale courses, phir Featured series ke poster
  const slides: Slide[] = [];
  for (const b of banners) {
    if ((b.placement || "hero") === "poster") continue;
    const mob = String(b.image_url_mobile || "");
    const img = bannerImage(b) || mob;
    if (!img) continue;
    slides.push({ img, imgMobile: mob || undefined, href: hrefOf(b.link || b.link_url || b.redirect_url), title: b.title || "" });
  }
  for (const c of webCourses) {
    if (!c.is_featured) continue;
    const mob = String(c.thumbnail_url_mobile || "");
    const img = courseImage(c) || mob;
    if (!img) continue;
    slides.push({ img, imgMobile: mob || undefined, href: `/course/${c.id}`, title: courseTitle(c) });
  }
  // Mock / Typing / Descriptive series jinpe admin ne "Featured" tick lagaya.
  // Band/delete hote hi backend inhe bhejna band kar deta hai.
  for (const sr of featuredSeries) {
    const mob = String(sr.thumbnail_url_mobile || "");
    const img = String(sr.thumbnail_url || "") || mob;
    if (!img || !sr.link) continue;
    slides.push({ img, imgMobile: mob || undefined, href: hrefOf(sr.link), title: sr.title || "" });
  }

  const featured = webCourses.slice(0, 8);

  return (
    <V2Shell>
      <AnnouncementBar />
      <SiteHeader />

      <main className="v2-wrap v2-main">
        <div className="v2-narrow">
          <SearchBox />
          <LiveTestBanner />
        </div>

        <div style={{ marginTop: 14 }}>
          {slides.length > 0 ? (
            <HeroCarousel slides={slides} />
          ) : (
            <section className="v2-hero-default">
              <h1 className="v2-h1" style={{ color: "#fff", maxWidth: 620 }}>
                Crack SSC, IB &amp; Railway Exams
              </h1>
              <p style={{ margin: "12px 0 20px", fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.86)", maxWidth: 520 }}>
                Courses, real exam-interface mock tests and daily practice — in Hindi + English, guided by Nikki Ma&apos;am.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/mock-tests" className="v2-btn v2-btn-gold">
                  Try a free mock test
                </Link>
                <Link href="/courses" className="v2-btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}>
                  Explore courses
                </Link>
              </div>
            </section>
          )}
        </div>

        <div className="v2-narrow">
          <HomePoster />
          <ExamCountdown />
        </div>

        <section className="v2-sec">
          <div className="v2-head">
            <h2 className="v2-h2">Start preparing</h2>
          </div>
          <div className="v2-tiles">
            {TILES.map(({ href, title, desc, Icon }) => (
              <Link key={href} href={href} className="v2-tile">
                <span className="v2-tile-ic">
                  <Icon />
                </span>
                <b>{title}</b>
                <span>{desc}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="v2-sec">
          <div className="v2-head">
            <h2 className="v2-h2">Featured courses</h2>
            <Link href="/courses" className="v2-more">
              View all →
            </Link>
          </div>
          {featured.length === 0 ? (
            <p className="v2-sub">New courses launching soon — join our Telegram for updates!</p>
          ) : (
            <div className="v2-grid">
              {featured.map((c: any, k: number) => (
                <ProductCard
                  key={c.id}
                  href={`/course/${c.id}`}
                  title={courseTitle(c)}
                  img={courseImage(c)}
                  imgMobile={c.thumbnail_url_mobile || undefined}
                  price={Number(c.price) || 0}
                  original={Number(c.original_price) || 0}
                  priority={k < 4}
                  fallback={<IconBook size={30} />}
                  meta={Number(c.recent_buyers) > 0 ? <span>{c.recent_buyers} students enrolled recently</span> : c.course_type ? <span>{c.course_type}</span> : undefined}
                />
              ))}
            </div>
          )}
        </section>

        <section className="v2-sec">
          <h2 className="v2-h2">Why Selection Lab?</h2>
          <p className="v2-sub" style={{ marginBottom: 16 }}>
            We&apos;re new — and that&apos;s exactly why we do things differently.
          </p>
          <div className="v2-why">
            {WHY.map(({ Icon, title, desc }) => (
              <div key={title} className="v2-box">
                <div className="v2-box-ic">
                  <Icon size={20} />
                </div>
                <b>{title}</b>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="v2-sec v2-split">
          <div>
            <div className="v2-head">
              <h2 className="v2-h2">Meet our faculty</h2>
            </div>
            <div className="v2-fac">
              {FACULTY.map((f) => (
                <div key={f.name} className="v2-box">
                  <img src={f.img} alt={f.name} loading="lazy" />
                  <b>{f.name}</b>
                  <span>{f.subject}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="v2-head">
              <h2 className="v2-h2">Exams we cover</h2>
            </div>
            <div className="v2-pills">
              {EXAMS.map((e) => (
                <span key={e} className="v2-pill">
                  {e}
                </span>
              ))}
            </div>
            <a href="https://youtube.com/@selection_lab" target="_blank" rel="noopener noreferrer" className="v2-yt">
              <IconPlay /> Watch free classes on YouTube
            </a>
          </div>
        </section>

        <div className="v2-sec">
          <Testimonials />
        </div>

        <section className="v2-sec v2-band gold">
          <div>
            <b>Experience the real exam — free</b>
            <p>Attempt free mock tests on the same interface as the actual SSC/TCS exam. No payment needed.</p>
          </div>
          <Link href="/mock-tests" className="v2-btn v2-btn-gold">
            Start a free mock
          </Link>
        </section>

        <div className="v2-sec">
          <CommunitySection />
        </div>

        <section className="v2-sec v2-band navy">
          <div>
            <b>Teach on YouTube or Telegram?</b>
            <p>Share a coupon with your audience. They get a discount, you earn a share of every sale it brings.</p>
          </div>
          <Link href="/partner" className="v2-btn v2-btn-gold">
            Become a Partner
          </Link>
        </section>
      </main>

      <SiteFooter />
      <CommunityFloat />
    </V2Shell>
  );
}
