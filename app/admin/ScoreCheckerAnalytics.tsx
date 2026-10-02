"use client";

/**
 * ScoreCheckerAnalytics.tsx — admin: ek exam ka analytics.
 *
 * ScoreCheckerAdmin.tsx ke ExamCard me "Score analytics" button se khulta hai.
 * Endpoint: GET /score-checker-admin/exams/{id}/analytics
 *
 * SIRF ADMIN ko dikhta hai. Students ko public result page par sirf apni rank
 * milti hai — ye sab (score range, shift average, top scorers) unko nahi.
 *
 * Score range ka bucket backend apne aap exam ke total marks se banata hai
 * (jaise 200 marks -> 20-20 ke bucket), yahan kuch set nahi karna.
 */

import { useEffect, useState, type CSSProperties } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const LINE = "rgba(255,255,255,0.1)";
const MUTED = "#9a917f";
const RED = "#E05555";

const selectStyle: CSSProperties = {
  width: "100%", padding: "9px 10px", borderRadius: 10,
  background: "rgba(255,255,255,0.07)", color: "#fff",
  border: `1px solid ${LINE}`, fontSize: 13, outline: "none",
};

const th: CSSProperties = {
  textAlign: "left", fontSize: 10.5, fontWeight: 700, color: MUTED,
  padding: "6px 6px", whiteSpace: "nowrap",
};

const td: CSSProperties = { fontSize: 12.5, padding: "7px 6px", borderTop: `1px solid ${LINE}` };

export default function ExamAnalytics({ examId, api }: { examId: number; api: ApiFn }) {
  const [data, setData] = useState<any>(null);
  const [shift, setShift] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (shift) qs.set("shift", shift);
        if (category) qs.set("category", category);
        const q = qs.toString();
        const d = await api(
          `/score-checker-admin/exams/${examId}/analytics${q ? `?${q}` : ""}`
        );
        if (alive) {
          setData(d.analytics);
          setErr("");
        }
      } catch (e: any) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [examId, shift, category]);

  if (err) return <p style={{ color: RED, fontSize: 12.5, marginTop: 10 }}>{err}</p>;
  if (!data) return <p style={{ color: MUTED, fontSize: 12.5, marginTop: 10 }}>Loading...</p>;

  const maxCount = Math.max(1, ...(data.ranges || []).map((r: any) => r.count));

  return (
    <div style={{ marginTop: 12, opacity: loading ? 0.6 : 1 }}>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select style={selectStyle} value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="">All shifts</option>
          {(data.shift_options || []).map((s: any) => (
            <option key={s.key} value={s.key}>
              {s.label} — {s.count}
            </option>
          ))}
        </select>
        <select style={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {(data.category_options || []).map((c: any) => (
            <option key={c.name} value={c.name}>
              {c.name} — {c.count}
            </option>
          ))}
        </select>
      </div>

      {data.total_students === 0 ? (
        <p style={{ color: MUTED, fontSize: 12.5 }}>No submissions for this selection.</p>
      ) : (
        <>
          {/* Summary tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
            <Tile label="Students" value={data.total_students} />
            <Tile label="Average" value={data.average} />
            <Tile label="Median" value={data.median} />
            <Tile label="Highest" value={data.highest} />
            <Tile label="Lowest" value={data.lowest} />
            <Tile label="Total marks" value={data.max_marks} />
          </div>

          {/* Score range */}
          <Heading>
            Score range{" "}
            <span style={{ color: MUTED, fontWeight: 600, fontSize: 11.5 }}>
              (every {data.bucket_step} marks)
            </span>
          </Heading>
          <div style={{ marginBottom: 16 }}>
            {(data.ranges || []).map((r: any) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 62, fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{r.label}</div>
                <div style={{ flex: 1, height: 16, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(r.count / maxCount) * 100}%`,
                      height: "100%",
                      background: GOLD,
                      minWidth: r.count > 0 ? 3 : 0,
                    }}
                  />
                </div>
                <div style={{ width: 70, textAlign: "right", fontSize: 11.5, flexShrink: 0 }}>
                  {r.count} <span style={{ color: MUTED }}>({r.percent}%)</span>
                </div>
              </div>
            ))}
          </div>

          {/* Shift-wise */}
          <Heading>Shift-wise</Heading>
          <Table
            head={["Shift", "Students", "Avg", "High", "Low"]}
            rows={(data.shifts || []).map((s: any) => [
              <span key="l">
                {s.label}
                <div style={{ fontSize: 10.5, color: MUTED }}>{s.shift_time}</div>
              </span>,
              s.count, s.average, s.highest, s.lowest,
            ])}
          />

          {/* Section-wise */}
          {(data.sections || []).length > 0 && (
            <>
              <Heading>Section-wise average</Heading>
              <Table
                head={["Section", "Avg", "High", "Low"]}
                rows={data.sections.map((s: any) => [s.name, s.average, s.highest, s.lowest])}
              />
            </>
          )}

          {/* Category-wise */}
          <Heading>Category-wise</Heading>
          <Table
            head={["Category", "Students", "Avg", "High"]}
            rows={(data.categories || []).map((c: any) => [c.name, c.count, c.average, c.highest])}
          />

          {/* Top scorers */}
          <Heading>Top {(data.top || []).length} scorers</Heading>
          <Table
            head={["#", "Name", "Roll no", "Cat", "Score"]}
            rows={(data.top || []).map((t: any) => [
              t.rank,
              <span key="n">
                {t.name || "-"}
                {t.shift && <div style={{ fontSize: 10.5, color: MUTED }}>{t.shift}</div>}
              </span>,
              t.roll_no, t.category || "-", t.score,
            ])}
          />
        </>
      )}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 800, margin: "14px 0 7px" }}>{children}</div>;
}

function Tile({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "9px 10px", background: "rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 10.5, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: GOLD, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: any[][] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={td}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
