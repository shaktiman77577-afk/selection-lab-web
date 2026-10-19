"use client";

/**
 * ClosedTestersAdmin.tsx — Android app ki closed testing requests (Oct 2026).
 *
 * Student website ke /download page par apni Play Store wali Gmail deta hai.
 * Yahan:
 *   1. "Copy emails" -> Play Console -> Testing -> Closed testing -> Testers
 *      ki email list me paste -> Save.
 *   2. Wapas yahan select karke "Mark as added" -> student ko email jaata hai
 *      ("You're in") aur website par "Join as tester" + Play Store link.
 * Settings: Play Console ka opt-in link (email me yahi jaata hai), Play Store
 * link, aur "App ab public hai" switch (on = sabko seedha Play Store button).
 * Upar 3 switch (sab default OFF): Download page / Android / Windows —
 * website par kya dikhe. Turant save hote hain.
 *
 * Page: /admin/testers (app/admin/testers/page.tsx).
 * Base: /testers/admin  (backend routers/testers.py, right: users)
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;
type Row = {
  id: number; user_id: number; gmail: string; status: "pending" | "added" | "rejected";
  created_at?: string; added_at?: string | null; emailed_at?: string | null;
  name?: string | null; email?: string | null; phone?: string | null;
};
type Settings = {
  opt_in_url: string; play_url: string; android_public: boolean;
  page_on: boolean; android_on: boolean; windows_on: boolean;
};
type SwitchKey = "page_on" | "android_on" | "windows_on";
const SWITCHES: [SwitchKey, string, string][] = [
  ["page_on", "Download page", "Off = menu, footer, home se link gayab; /download par \"Coming soon\""],
  ["android_on", "Android card", "Play Store closed testing / public — Gmail request isi se chalti hai"],
  ["windows_on", "Windows card", "GitHub ki latest release se .exe download"],
];

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const GREEN = "#5dd97c";
const RED = "#ff6b6b";

const inputStyle: CSSProperties = {
  width: "100%", padding: "11px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.4)",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
};
const goldBtn: CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10,
  padding: "10px 15px", fontWeight: 800, fontSize: 13.5, cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`,
  borderRadius: 10, padding: "9px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const cardBox: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 };

const TABS: [Row["status"] | "all", string][] = [
  ["pending", "Pending"], ["added", "Added"], ["rejected", "Rejected"], ["all", "All"],
];

function when(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ClosedTestersAdmin({ api }: { api: ApiFn }) {
  const [tab, setTab] = useState<Row["status"] | "all">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings>({
    opt_in_url: "", play_url: "", android_public: false, page_on: false, android_on: false, windows_on: false,
  });
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/testers/admin/list?status=${tab}`);
      setRows(d.rows || []);
      setCounts(d.counts || {});
      setSettings(d.settings || null);
      if (d.settings) setForm(d.settings);
      setSel(new Set());
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Load nahi hua" });
    } finally {
      setLoading(false);
    }
  }, [api, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.gmail, r.name, r.phone, r.email].some((v) => (v || "").toLowerCase().includes(s)));
  }, [rows, q]);

  const allSelected = shown.length > 0 && shown.every((r) => sel.has(r.id));

  function toggle(id: number) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    setSel(allSelected ? new Set() : new Set(shown.map((r) => r.id)));
  }

  async function copyEmails() {
    const list = (sel.size ? shown.filter((r) => sel.has(r.id)) : shown).map((r) => r.gmail);
    if (!list.length) return;
    try {
      await navigator.clipboard.writeText(list.join(", "));
      setMsg({ ok: true, text: `${list.length} email copy ho gaye — Play Console ki tester list me paste kariye.` });
    } catch {
      window.prompt("Copy kariye:", list.join(", "));
    }
  }

  async function mark(status: Row["status"]) {
    const ids = Array.from(sel);
    if (!ids.length) return;
    if (status === "added" && !confirm(`${ids.length} student ko "added" karein? Unhe "You're in" email jaayega.\n\nPehle pakka kar lijiye ki ye email Play Console ki tester list me daal diye hain.`)) return;
    if (status === "rejected" && !confirm(`${ids.length} request reject karein?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const d = await api("/testers/admin/mark", "POST", { ids, status });
      setMsg({
        ok: true,
        text: status === "added"
          ? `${d.updated} added · ${d.emailed} ko email gaya${d.emailed < d.updated ? " (baaki ka email fail — Resend check kariye)" : ""}`
          : `${d.updated} update hue`,
      });
      await load();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Nahi hua" });
    } finally {
      setBusy(false);
    }
  }

  // Switch dabate hi save — alag se "Save" nahi dabana
  async function flip(k: SwitchKey) {
    if (!settings) return;
    const v = !settings[k];
    setBusy(true);
    setMsg(null);
    try {
      const d = await api("/testers/admin/settings", "POST", { [k]: v });
      setSettings(d.settings);
      setForm((f) => ({ ...f, [k]: d.settings[k] }));
      setMsg({ ok: true, text: `${SWITCHES.find((x) => x[0] === k)?.[1]} ${v ? "ON" : "OFF"} — website par ~1 minute me dikhega` });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Save nahi hua" });
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    setMsg(null);
    try {
      const { opt_in_url, play_url, android_public } = form;
      const d = await api("/testers/admin/settings", "POST", { opt_in_url, play_url, android_public });
      setSettings(d.settings);
      setForm(d.settings);
      setMsg({ ok: true, text: "Settings save ho gayi" });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Save nahi hua" });
    } finally {
      setBusy(false);
    }
  }

  const needsOptIn = settings && !settings.opt_in_url;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>Closed Testers (Android)</h2>
      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 14px", lineHeight: 1.6 }}>
        Website ke <b>/download</b> page se aayi requests. Tarika: <b>1.</b> Emails copy → <b>2.</b> Play Console → Testing → Closed
        testing → Testers → email list me paste → Save → <b>3.</b> Yahan select karke <b>Mark as added</b> (student ko email jaata hai).
      </p>

      {/* Website par kya dikhe — 3 switch */}
      {settings && (
        <div style={{ ...cardBox, marginBottom: 14, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>🌐 Website par kya dikhe</div>
          {SWITCHES.map(([k, label, hint]) => {
            const on = settings[k];
            const blocked = k !== "page_on" && !settings.page_on;
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.45 }}>
                    {hint}{blocked && on ? " · Download page OFF hai, isliye abhi chhupa hai" : ""}
                  </div>
                </div>
                <button onClick={() => flip(k)} disabled={busy} aria-pressed={on}
                  style={{
                    flex: "none", minWidth: 64, padding: "8px 12px", borderRadius: 999, fontWeight: 800, fontSize: 12.5,
                    cursor: "pointer", border: `1px solid ${on ? GREEN : BORDER}`,
                    background: on ? "rgba(93,217,124,0.15)" : "transparent", color: on ? GREEN : MUTED,
                  }}>
                  {on ? "ON" : "OFF"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {settings?.android_public && (
        <div style={{ ...cardBox, borderColor: GREEN, marginBottom: 12, fontSize: 13.5 }}>
          🟢 App <b>public</b> hai — website par sabko seedha Play Store button dikh raha hai, form band hai.
        </div>
      )}
      {needsOptIn && (
        <div style={{ ...cardBox, borderColor: RED, marginBottom: 12, fontSize: 13.5 }}>
          ⚠️ Opt-in link abhi set nahi hai — iske bina &ldquo;Mark as added&rdquo; nahi chalega. Neeche <b>Settings</b> kholiye.
        </div>
      )}

      {/* Settings */}
      <div style={{ ...cardBox, marginBottom: 14 }}>
        <button onClick={() => setShowSettings((v) => !v)} style={{ ...ghostBtn, border: "none", padding: 0, fontSize: 14, fontWeight: 800 }}>
          ⚙️ Settings {showSettings ? "▲" : "▼"}
        </button>
        {showSettings && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <label>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>Opt-in link (Play Console → Closed testing → Testers → &ldquo;Join on the web&rdquo; / copy link)</div>
              <input style={inputStyle} value={form.opt_in_url} placeholder="https://play.google.com/apps/testing/com.selectionlab"
                onChange={(e) => setForm({ ...form, opt_in_url: e.target.value })} />
            </label>
            <label>
              <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>Play Store link</div>
              <input style={inputStyle} value={form.play_url} placeholder="https://play.google.com/store/apps/details?id=com.selectionlab"
                onChange={(e) => setForm({ ...form, play_url: e.target.value })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={form.android_public} onChange={(e) => setForm({ ...form, android_public: e.target.checked })} />
              App ab sabke liye public hai (form band, sabko seedha Play Store button)
            </label>
            <div>
              <button style={goldBtn} disabled={busy} onClick={saveSettings}>Save settings</button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              padding: "8px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              background: tab === k ? GOLD : "transparent", color: tab === k ? "#1a1a1a" : "#fff",
              border: `1px solid ${tab === k ? GOLD : BORDER}`,
            }}>
            {l}{k !== "all" && counts[k] !== undefined ? ` (${counts[k]})` : ""}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <input style={{ ...inputStyle, maxWidth: 260 }} placeholder="Gmail / naam / phone se dhoondho" value={q} onChange={(e) => setQ(e.target.value)} />
        <button style={ghostBtn} onClick={toggleAll} disabled={!shown.length}>{allSelected ? "Select none" : "Select all"}</button>
        <button style={ghostBtn} onClick={copyEmails} disabled={!shown.length}>
          📋 Copy {sel.size ? `${sel.size} selected` : "all"} emails
        </button>
        {tab !== "added" && (
          <button style={goldBtn} onClick={() => mark("added")} disabled={busy || !sel.size}>
            ✅ Mark as added{sel.size ? ` (${sel.size})` : ""}
          </button>
        )}
        {tab !== "rejected" && (
          <button style={{ ...ghostBtn, color: RED, borderColor: "rgba(255,107,107,0.4)" }} onClick={() => mark("rejected")} disabled={busy || !sel.size}>
            Reject
          </button>
        )}
        {tab !== "pending" && (
          <button style={ghostBtn} onClick={() => mark("pending")} disabled={busy || !sel.size}>Back to pending</button>
        )}
      </div>

      {msg && (
        <div style={{ ...cardBox, marginBottom: 12, borderColor: msg.ok ? GREEN : RED, color: msg.ok ? GREEN : RED, fontSize: 13.5, fontWeight: 700 }}>
          {msg.text}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ color: MUTED, padding: 20 }}>Loading…</div>
      ) : !shown.length ? (
        <div style={{ ...cardBox, color: MUTED, textAlign: "center", padding: 28 }}>Koi request nahi</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {shown.map((r) => (
            <label key={r.id} style={{ ...cardBox, display: "flex", gap: 12, alignItems: "center", cursor: "pointer", borderColor: sel.has(r.id) ? GOLD : BORDER }}>
              <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} style={{ width: 18, height: 18, flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14.5, wordBreak: "break-all" }}>{r.gmail}</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>
                  {r.name || "—"}{r.phone ? ` · ${r.phone}` : ""} · #{r.user_id} · {when(r.created_at)}
                </div>
              </div>
              <div style={{ textAlign: "right", flex: "none", fontSize: 12 }}>
                <div style={{ fontWeight: 800, color: r.status === "added" ? GREEN : r.status === "rejected" ? RED : GOLD, textTransform: "capitalize" }}>{r.status}</div>
                {r.status === "added" && (
                  <div style={{ color: MUTED, marginTop: 2 }}>{r.emailed_at ? `📧 ${when(r.emailed_at)}` : "📧 email nahi gaya"}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
