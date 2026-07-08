"use client";

/**
 * AppContentAdmin.tsx  --  Selection Lab admin: App/Home dynamic content
 * Matches the admin panel's dark inline-style theme.
 * Wired into app/admin/page.tsx as the "appcontent" tab: <AppContentAdmin api={api} />
 *
 * Endpoints:
 *   GET /app-config/admin      -> { config }
 *   PUT /app-config/admin      body { config }
 *
 * Editable sections: hero_slides, why_us, faculty, exams, community.
 * Changes are live immediately (web on reload, app on next open).
 */

import { useState, useEffect, type CSSProperties } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const TEXT = "#f3ede0";

const ACTIONS = ["mock", "descriptive", "courses", ""];

const box: CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 16,
  marginBottom: 18,
};
const head: CSSProperties = {
  fontWeight: 800,
  fontSize: 17,
  marginBottom: 12,
  color: GOLD,
};
const card: CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: 12,
  marginBottom: 10,
  background: "rgba(255,255,255,0.02)",
};
const input: CSSProperties = {
  width: "100%",
  padding: 9,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  marginBottom: 6,
  fontSize: 13,
  boxSizing: "border-box",
  background: "#0f0d0a",
  color: TEXT,
};
const lbl: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: MUTED,
  textTransform: "uppercase",
};
const btn: CSSProperties = {
  padding: "7px 13px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};
const goldBtn: CSSProperties = { ...btn, background: GOLD, color: "#1a1a1a" };
const darkBtn: CSSProperties = {
  ...btn,
  background: "transparent",
  color: TEXT,
  border: `1px solid ${BORDER}`,
};
const delBtn: CSSProperties = { ...btn, background: "#c0392b", color: "#fff" };
const row: CSSProperties = { display: "flex", gap: 6, alignItems: "center" };

export default function AppContentAdmin({ api }: { api: ApiFn }) {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await api("/app-config/admin", "GET");
        setCfg(d.config || {});
      } catch (e: any) {
        setMsg(e.message || "Could not load config.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api("/app-config/admin", "PUT", { config: cfg });
      setMsg("✅ Saved! Changes are live (app users see them on next open).");
    } catch (e: any) {
      setMsg("❌ " + (e.message || "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 20, color: MUTED }}>Loading…</div>;
  if (!cfg)
    return <div style={{ padding: 20, color: MUTED }}>{msg || "No config"}</div>;

  const setField = (key: string, val: any) => setCfg({ ...cfg, [key]: val });
  const updateItem = (key: string, i: number, patch: any) => {
    const arr = [...(cfg[key] || [])];
    arr[i] = { ...arr[i], ...patch };
    setField(key, arr);
  };
  const removeItem = (key: string, i: number) => {
    const arr = [...(cfg[key] || [])];
    arr.splice(i, 1);
    setField(key, arr);
  };
  const addItem = (key: string, blank: any) =>
    setField(key, [...(cfg[key] || []), blank]);
  const move = (key: string, i: number, dir: number) => {
    const arr = [...(cfg[key] || [])];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setField(key, arr);
  };

  const Field = ({
    value,
    onChange,
    placeholder,
    area,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    area?: boolean;
  }) =>
    area ? (
      <textarea
        style={{ ...input, minHeight: 60 }}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        style={input}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  const SaveBtn = (
    <button onClick={save} disabled={saving} style={{ ...goldBtn, padding: "10px 22px", fontSize: 14 }}>
      {saving ? "Saving…" : "Save all changes"}
    </button>
  );
  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ ...row, justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ color: TEXT, fontWeight: 900, fontSize: 20 }}>App Content</h2>
        {SaveBtn}
      </div>
      {msg && <div style={{ marginBottom: 12, fontWeight: 700, color: TEXT }}>{msg}</div>}
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>
        Ye sab live badalta hai — app update ki zaroorat nahi. User ko agli baar app kholne pe naya dikhega.
      </p>

      {/* HERO SLIDES */}
      <div style={box}>
        <div style={head}>🎠 Hero Slides (home carousel)</div>
        {(cfg.hero_slides || []).map((sd: any, i: number) => (
          <div key={i} style={card}>
            <div style={{ ...row, justifyContent: "space-between", marginBottom: 6 }}>
              <b style={{ fontSize: 12, color: TEXT }}>Slide {i + 1}</b>
              <div style={row}>
                <button style={darkBtn} onClick={() => move("hero_slides", i, -1)}>↑</button>
                <button style={darkBtn} onClick={() => move("hero_slides", i, 1)}>↓</button>
                <button style={delBtn} onClick={() => removeItem("hero_slides", i)}>Delete</button>
              </div>
            </div>
            <span style={lbl}>Emoji</span>
            <Field value={sd.emoji} onChange={(v) => updateItem("hero_slides", i, { emoji: v })} placeholder="🏆" />
            <span style={lbl}>Title</span>
            <Field value={sd.title} onChange={(v) => updateItem("hero_slides", i, { title: v })} placeholder="Big headline" />
            <span style={lbl}>Subtitle</span>
            <Field area value={sd.subtitle} onChange={(v) => updateItem("hero_slides", i, { subtitle: v })} placeholder="Description line" />
            <div style={row}>
              <div style={{ flex: 1 }}>
                <span style={lbl}>Button 1 text</span>
                <Field value={sd.primary_label} onChange={(v) => updateItem("hero_slides", i, { primary_label: v })} placeholder="Start Mock →" />
              </div>
              <div style={{ flex: 1 }}>
                <span style={lbl}>Button 1 goes to</span>
                <select style={input} value={sd.primary_action || ""} onChange={(e) => updateItem("hero_slides", i, { primary_action: e.target.value })}>
                  {ACTIONS.map((a) => <option key={a} value={a}>{a || "(none)"}</option>)}
                </select>
              </div>
            </div>
            <div style={row}>
              <div style={{ flex: 1 }}>
                <span style={lbl}>Button 2 text (optional)</span>
                <Field value={sd.secondary_label} onChange={(v) => updateItem("hero_slides", i, { secondary_label: v })} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={lbl}>Button 2 goes to</span>
                <select style={input} value={sd.secondary_action || ""} onChange={(e) => updateItem("hero_slides", i, { secondary_action: e.target.value })}>
                  {ACTIONS.map((a) => <option key={a} value={a}>{a || "(none)"}</option>)}
                </select>
              </div>
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>Tip: "goes to" me mock / descriptive / courses chuno, ya poora URL paste karo (https://…)</div>
          </div>
        ))}
        <button style={darkBtn} onClick={() => addItem("hero_slides", { emoji: "🎯", title: "", subtitle: "", primary_label: "", primary_action: "mock", secondary_label: "", secondary_action: "" })}>+ Add slide</button>
      </div>

      {/* WHY US */}
      <div style={box}>
        <div style={head}>⭐ Why Choose Us</div>
        {(cfg.why_us || []).map((w: any, i: number) => (
          <div key={i} style={card}>
            <div style={{ ...row, justifyContent: "space-between" }}>
              <b style={{ fontSize: 12, color: TEXT }}>Card {i + 1}</b>
              <button style={delBtn} onClick={() => removeItem("why_us", i)}>Delete</button>
            </div>
            <div style={row}>
              <div style={{ width: 80 }}>
                <span style={lbl}>Emoji</span>
                <Field value={w.emoji} onChange={(v) => updateItem("why_us", i, { emoji: v })} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={lbl}>Title</span>
                <Field value={w.title} onChange={(v) => updateItem("why_us", i, { title: v })} />
              </div>
            </div>
            <span style={lbl}>Text</span>
            <Field area value={w.text} onChange={(v) => updateItem("why_us", i, { text: v })} />
          </div>
        ))}
        <button style={darkBtn} onClick={() => addItem("why_us", { emoji: "✨", title: "", text: "" })}>+ Add card</button>
      </div>

      {/* FACULTY */}
      <div style={box}>
        <div style={head}>👩‍🏫 Faculty</div>
        {(cfg.faculty || []).map((f: any, i: number) => (
          <div key={i} style={card}>
            <div style={{ ...row, justifyContent: "space-between" }}>
              <b style={{ fontSize: 12, color: TEXT }}>Faculty {i + 1}</b>
              <button style={delBtn} onClick={() => removeItem("faculty", i)}>Delete</button>
            </div>
            <span style={lbl}>Name</span>
            <Field value={f.name} onChange={(v) => updateItem("faculty", i, { name: v })} />
            <span style={lbl}>Subject</span>
            <Field value={f.subject} onChange={(v) => updateItem("faculty", i, { subject: v })} />
            <span style={lbl}>Photo URL (full https:// link)</span>
            <Field value={f.image_url} onChange={(v) => updateItem("faculty", i, { image_url: v })} placeholder="https://…/photo.jpg" />
          </div>
        ))}
        <button style={darkBtn} onClick={() => addItem("faculty", { name: "", subject: "", image_url: "" })}>+ Add faculty</button>
      </div>

      {/* EXAMS */}
      <div style={box}>
        <div style={head}>🎯 Exams (chips)</div>
        {(cfg.exams || []).map((ex: string, i: number) => (
          <div key={i} style={{ ...row, marginBottom: 6 }}>
            <input style={{ ...input, marginBottom: 0 }} value={ex} onChange={(e) => { const a = [...cfg.exams]; a[i] = e.target.value; setField("exams", a); }} />
            <button style={delBtn} onClick={() => removeItem("exams", i)}>✕</button>
          </div>
        ))}
        <button style={darkBtn} onClick={() => setField("exams", [...(cfg.exams || []), "New Exam"])}>+ Add exam</button>
      </div>

      {/* COMMUNITY */}
      <div style={box}>
        <div style={head}>🌐 Community Links</div>
        {["youtube", "telegram", "instagram", "whatsapp"].map((k) => (
          <div key={k}>
            <span style={lbl}>{k}</span>
            <Field value={(cfg.community || {})[k]} onChange={(v) => setField("community", { ...(cfg.community || {}), [k]: v })} placeholder="https://…" />
          </div>
        ))}
        <div style={{ fontSize: 11, color: MUTED }}>Khali chhodo to wo link app me nahi dikhega.</div>
      </div>

      <div style={{ marginTop: 8 }}>{SaveBtn}</div>
    </div>
  );
                    }
