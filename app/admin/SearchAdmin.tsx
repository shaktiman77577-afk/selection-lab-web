"use client";

/**
 * SearchAdmin.tsx — admin: trending chips aur search log.
 *
 * Search log wala hissa is poore feature ki sabse kaam ki cheez hai.
 * "0 results" wali queries upar aur laal me dikhti hain, kyunki wahi maang
 * hai jo aap poori nahi kar rahe. 40 log `stenographer` dhoondh rahe hain
 * aur aapke paas hai hi nahi — ye baat kahin aur se pata nahi chalti.
 *
 * app/admin/page.tsx me "search" tab ke roop me judta hai.
 * Base: /admin-extra/search
 */

import { useState, useEffect, type ReactNode, type CSSProperties } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";

const inputStyle: CSSProperties = {
  width: "100%", padding: "11px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.4)",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
};
const goldBtn: CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10,
  padding: "11px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`,
  borderRadius: 10, padding: "8px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const dangerBtn: CSSProperties = {
  background: "transparent", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const cardBox: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 };
const rowCard: CSSProperties = {
  ...cardBox, display: "flex", alignItems: "center", justifyContent: "space-between",
  gap: 10, marginBottom: 10,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

export default function SearchAdmin({ api }: { api: ApiFn }) {
  const [tab, setTab] = useState<"log" | "trending">("log");

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Search</h2>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {([["log", "What people searched"], ["trending", "Trending chips"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "8px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              border: `1px solid ${tab === k ? GOLD : BORDER}`,
              background: tab === k ? GOLD : "transparent",
              color: tab === k ? "#1a1a1a" : "#fff",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "log" ? <LogTab api={api} /> : <TrendingTab api={api} />}
    </div>
  );
}

// ===========================================================================
// SEARCH LOG
// ===========================================================================
function LogTab({ api }: { api: ApiFn }) {
  const [rows, setRows] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api(`/admin-extra/search/log?days=${days}`, "GET")
      .then((r) => { setRows(r?.queries || []); setTotal(r?.total_searches || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, [days]); // eslint-disable-line

  const shown = onlyEmpty ? rows.filter((r) => r.empty_count > 0) : rows;
  const emptyTotal = rows.filter((r) => r.empty_count > 0).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ ...inputStyle, width: "auto", padding: "8px 11px", fontSize: 13 }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={3650}>All time</option>
        </select>
        <button onClick={() => setOnlyEmpty(!onlyEmpty)} style={onlyEmpty ? { ...ghostBtn, borderColor: "#ff6b6b", color: "#ff6b6b" } : ghostBtn}>
          {onlyEmpty ? "Showing no-result only" : `No-result only (${emptyTotal})`}
        </button>
        <button onClick={load} style={ghostBtn}>Refresh</button>
      </div>

      <div style={{ ...cardBox, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65 }}>
          <b style={{ color: "#e0dacb" }}>{total}</b> searches ·
          {" "}<b style={{ color: "#e0dacb" }}>{rows.length}</b> different queries ·
          {" "}<b style={{ color: "#ff6b6b" }}>{emptyTotal}</b> found nothing
          <div style={{ marginTop: 6 }}>
            Queries that found nothing are the ones worth reading. They tell you what people
            came looking for and did not get.
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      ) : shown.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6 }}>
          Nothing yet. Searches will start showing here once people use the box.
        </p>
      ) : (
        shown.map((r) => {
          const bad = r.empty_count > 0;
          return (
            <div
              key={r.query_norm}
              style={{ ...rowCard, borderColor: bad ? "rgba(255,107,107,0.35)" : BORDER }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {r.query_norm}
                  {bad && (
                    <span style={{ fontSize: 10, fontWeight: 900, color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)", background: "rgba(255,107,107,0.14)", borderRadius: 6, padding: "1px 6px", marginLeft: 8 }}>
                      NO RESULTS
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                  {r.count} searches
                  {bad ? ` · ${r.empty_count} of them found nothing` : ""}
                  {r.last_at ? ` · last ${String(r.last_at).slice(0, 10)}` : ""}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: bad ? "#ff6b6b" : GOLD, flexShrink: 0 }}>
                {r.count}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ===========================================================================
// TRENDING
// ===========================================================================
function TrendingTab({ api }: { api: ApiFn }) {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ label: "", query: "", link: "", display_order: "0" });

  function load() {
    api("/admin-extra/search/trending", "GET")
      .then((r) => setRows(r?.trending || []))
      .catch(() => {});
  }
  useEffect(load, []); // eslint-disable-line

  async function add() {
    if (!form.label.trim()) return alert("Label is required.");
    setBusy(true);
    try {
      await api("/admin-extra/search/trending", "POST", {
        label: form.label.trim(),
        query: form.query.trim() || null,
        link: form.link.trim() || null,
        display_order: Number(form.display_order) || 0,
      });
      setForm({ label: "", query: "", link: "", display_order: String(rows.length + 1) });
      load();
    } catch (e: any) { alert(e?.message || "Could not add it."); }
    finally { setBusy(false); }
  }

  async function remove(t: any) {
    if (!confirm(`Remove the "${t.label}" chip?`)) return;
    await api(`/admin-extra/search/trending/${t.id}`, "DELETE");
    load();
  }

  async function toggle(t: any) {
    await api(`/admin-extra/search/trending/${t.id}`, "PUT", { ...t, is_active: !t.is_active });
    load();
  }

  return (
    <div>
      <div style={{ ...cardBox, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>New chip</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          These show under the search box before anyone types. Keep 4 to 6 — more than that
          and people stop reading them.
        </p>

        <Field label="Label" hint="What the chip says: P&amp;H Clerk">
          <input style={inputStyle} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </Field>

        <Field label="Search text (optional)" hint="Tapping the chip puts this in the search box.">
          <input style={inputStyle} value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} placeholder="clerk" />
        </Field>

        <Field label="Link (optional)" hint="Fill this and the chip jumps straight to the page instead of searching. Example: /tier2">
          <input style={inputStyle} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/tier2" />
        </Field>

        <Field label="Order">
          <input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
        </Field>

        <button onClick={add} disabled={busy} style={{ ...goldBtn, width: "100%" }}>
          {busy ? "Saving…" : "Add chip"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13.5 }}>No chips yet.</p>
      ) : (
        rows.map((t) => (
          <div key={t.id} style={{ ...rowCard, opacity: t.is_active ? 1 : 0.45 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {t.label}
                {!t.is_active && (
                  <span style={{ fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 8 }}>OFF</span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                {t.link ? `jumps to ${t.link}` : t.query ? `searches "${t.query}"` : `searches "${t.label}"`}
                {" "}· order {t.display_order}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => toggle(t)} style={ghostBtn}>{t.is_active ? "Turn off" : "Turn on"}</button>
              <button onClick={() => remove(t)} style={dangerBtn}>Remove</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
