"use client";

// Mock test series ki list (website redesign).
// Series server se aati hain (sabke liye same). Login ho to browser me ek baar
// user ke saath dobara mangte hain, taaki "OWNED" sahi dikhe.
import { useEffect, useState } from "react";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import ProductCard from "./ProductCard";
import { IconMock } from "./Icons";

type F = "all" | "owned" | "free";

export default function MockSeriesGrid({ initial }: { initial: any[] }) {
  const [series, setSeries] = useState<any[]>(initial);
  const [loggedIn, setLoggedIn] = useState(false);
  const [f, setF] = useState<F>("all");

  useEffect(() => {
    const u: any = getUser();
    if (!u?.id) return;
    setLoggedIn(true);
    fetch(`${API_URL}/mock-tests/series?platform=web&user_id=${u.id}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.series;
        if (Array.isArray(list)) setSeries(list);
      })
      .catch(() => {});
  }, []);

  const shown = series.filter((s) => {
    if (f === "owned") return !!s.is_purchased;
    if (f === "free") return Number(s.free_count) > 0 || Number(s.price) <= 0;
    return true;
  });

  const filters: [F, string][] = loggedIn
    ? [["all", "All"], ["owned", "Owned"], ["free", "Has free tests"]]
    : [["all", "All"], ["free", "Has free tests"]];

  return (
    <>
      <div className="v2-toolbar">
        <div className="v2-seg" role="group" aria-label="Filter">
          {filters.map(([k, label]) => (
            <button key={k} className={f === k ? "on" : ""} aria-pressed={f === k} onClick={() => setF(k)}>
              {label}
            </button>
          ))}
        </div>
        <span className="v2-count">
          {shown.length} series
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="v2-empty">
          <IconMock size={40} />
          <p style={{ margin: "10px 0 0" }}>{series.length === 0 ? "New mock test series launching soon — join our Telegram for updates!" : "Nothing here yet."}</p>
        </div>
      ) : (
        <div className="v2-grid v2-grid-1">
          {shown.map((s, k) => {
            const tests = Number(s.tests_count ?? s.test_count) || 0;
            const free = Number(s.free_count) || 0;
            return (
              <ProductCard
                key={s.id}
                href={`/mock-tests/${s.id}`}
                title={s.title || "Test series"}
                img={s.thumbnail_url || undefined}
                imgMobile={s.thumbnail_url_mobile || undefined}
                price={Number(s.price) || 0}
                original={Number(s.original_price) || 0}
                owned={!!s.is_purchased}
                description={s.description || undefined}
                priority={k < 3}
                fallback={<IconMock size={30} />}
                meta={
                  tests > 0 || free > 0 ? (
                    <>
                      {tests > 0 ? <span>{tests} tests</span> : null}
                      {free > 0 && !s.is_purchased ? <span className="ok">{free} free</span> : null}
                    </>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}
