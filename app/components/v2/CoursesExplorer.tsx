"use client";

// Courses list ka search + filter (browser me). Courses server se aate hain.
import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { IconBook, IconSearch } from "./Icons";

export type SlimCourse = {
  id: number | string;
  title: string;
  img: string;
  imgMobile?: string;
  price: number;
  original: number;
  type: string;
  recent: number;
};

type PriceF = "all" | "free" | "paid";

export default function CoursesExplorer({ courses }: { courses: SlimCourse[] }) {
  const [q, setQ] = useState("");
  const [price, setPrice] = useState<PriceF>("all");
  const [type, setType] = useState("all");

  const types = useMemo(() => Array.from(new Set(courses.map((c) => c.type).filter(Boolean))), [courses]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return courses.filter((c) => {
      if (s && !c.title.toLowerCase().includes(s)) return false;
      if (price === "free" && c.price !== 0) return false;
      if (price === "paid" && c.price === 0) return false;
      if (type !== "all" && c.type !== type) return false;
      return true;
    });
  }, [courses, q, price, type]);

  return (
    <>
      <div className="v2-toolbar">
        <label className="v2-search">
          <IconSearch size={18} />
          <span className="sr">Search courses</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" />
        </label>
        <div className="v2-seg" role="group" aria-label="Price">
          {(["all", "free", "paid"] as PriceF[]).map((p) => (
            <button key={p} className={price === p ? "on" : ""} aria-pressed={price === p} onClick={() => setPrice(p)}>
              {p === "all" ? "All" : p === "free" ? "Free" : "Paid"}
            </button>
          ))}
        </div>
      </div>

      <div className="v2-types">
        {types.length > 1 && (
          <>
            <button className={`v2-type${type === "all" ? " on" : ""}`} aria-pressed={type === "all"} onClick={() => setType("all")}>
              All types
            </button>
            {types.map((t) => (
              <button key={t} className={`v2-type${type === t ? " on" : ""}`} aria-pressed={type === t} onClick={() => setType(t)}>
                {t}
              </button>
            ))}
          </>
        )}
        <span className="v2-count">
          {shown.length} {shown.length === 1 ? "course" : "courses"}
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="v2-empty">
          <IconBook size={40} />
          <p style={{ margin: "10px 0 0" }}>{courses.length === 0 ? "New courses launching soon — join our Telegram for updates!" : "No courses match your search."}</p>
        </div>
      ) : (
        <div className="v2-grid">
          {shown.map((c, k) => (
            <ProductCard
              key={c.id}
              href={`/course/${c.id}`}
              title={c.title}
              img={c.img}
              imgMobile={c.imgMobile}
              price={c.price}
              original={c.original}
              priority={k < 4}
              fallback={<IconBook size={30} />}
              meta={c.recent > 0 ? <span>{c.recent} students enrolled recently</span> : c.type ? <span>{c.type}</span> : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
