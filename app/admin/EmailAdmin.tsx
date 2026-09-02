"use client";

/**
 * EmailAdmin.tsx — admin: email bhejna aur reply padhna.
 *
 * Do tab:
 *   Compose — kisi bhi address par mail. Template chip se draft bhar jata hai,
 *             uske baad aap usme jitna chahein badal sakte hain. Template
 *             chune bina bhi seedha likh kar bhej sakte hain.
 *   Inbox   — jo baat-cheet chal rahi hain. Jinme jawab aapka bacha hai
 *             wo sabse upar, aur wahin se reply bhi.
 *
 * app/admin/page.tsx me "email" tab ke roop me judta hai.
 * Base: /email/admin
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
const cardBox: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

export default function EmailAdmin({ api }: { api: ApiFn }) {
  const [tab, setTab] = useState<"compose" | "inbox">("compose");
  const [waiting, setWaiting] = useState(0);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Email</h2>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {([["compose", "Compose"], ["inbox", "Inbox"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "8px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              border: `1px solid ${tab === k ? GOLD : BORDER}`,
              background: tab === k ? GOLD : "transparent",
              color: tab === k ? "#1a1a1a" : "#fff",
            }}
          >
            {l}
            {k === "inbox" && waiting > 0 && (
              <span style={{ marginLeft: 6, background: "#ff6b6b", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
                {waiting}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "compose" ? <Compose api={api} /> : <Inbox api={api} onCount={setWaiting} />}
    </div>
  );
}

// ===========================================================================
// COMPOSE
// ===========================================================================
function Compose({ api }: { api: ApiFn }) {
  const [froms, setFroms] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [form, setForm] = useState({ to: "", contact_name: "", subject: "", body: "", from_email: "", label: "collaboration" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api("/email/admin/from-options").then((r) => {
      const o = r?.options || [];
      setFroms(o);
      setForm((f) => ({ ...f, from_email: f.from_email || o[0] || "" }));
    }).catch(() => {});
    api("/email/admin/templates").then((r) => setTemplates(r?.templates || [])).catch(() => {});
  }, []); // eslint-disable-line

  // Template sirf draft bharta hai. Uske baad sab kuch aapka — naam jodiye,
  // line badliye, kuch hataiye. Jo box me dikh raha hai wahi jayega.
  function useTemplate(t: any) {
    if (form.body.trim() && !confirm("Jo likha hai wo hat jayega. Template lagayein?")) return;
    setForm({ ...form, subject: t.subject, body: t.body });
  }

  async function send() {
    if (!form.to.trim() || !form.subject.trim() || !form.body.trim()) {
      setMsg({ ok: false, text: "To, subject aur message — teeno chahiye." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await api("/email/admin/send", "POST", {
        to: form.to.trim(),
        contact_name: form.contact_name.trim() || null,
        subject: form.subject.trim(),
        body: form.body,
        from_email: form.from_email,
        label: form.label,
      });
      setMsg({ ok: true, text: `Bhej diya — ${form.to.trim()}` });
      setForm({ ...form, to: "", contact_name: "", subject: "", body: "" });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Nahi bheja ja saka." });
    }
    setBusy(false);
  }

  return (
    <div>
      {templates.length > 0 && (
        <div style={{ ...cardBox, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
            Template se shuruaat kijiye, phir jitna chahein badal lijiye
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {templates.map((t) => (
              <button key={t.id} onClick={() => useTemplate(t)} style={ghostBtn}>{t.name}</button>
            ))}
          </div>
        </div>
      )}

      <div style={cardBox}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <Field label="To">
              <input style={inputStyle} value={form.to} placeholder="name@example.com"
                     onChange={(e) => setForm({ ...form, to: e.target.value })} />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="Name (optional)" hint="Inbox me pehchanne ke liye">
              <input style={inputStyle} value={form.contact_name}
                     onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <Field label="From" hint="Reply hamesha support@selectionlab.in par aayega">
              <select style={inputStyle} value={form.from_email}
                      onChange={(e) => setForm({ ...form, from_email: e.target.value })}>
                {froms.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="Label">
              <select style={inputStyle} value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}>
                <option value="collaboration">Collaboration</option>
                <option value="general">General</option>
                <option value="support">Support</option>
              </select>
            </Field>
          </div>
        </div>

        <Field label="Subject">
          <input style={inputStyle} value={form.subject}
                 onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </Field>

        <Field label="Message" hint="Saada text likhiye. Khaali line se naya paragraph banta hai — Selection Lab ka design apne aap lag jayega.">
          <textarea rows={16} style={{ ...inputStyle, lineHeight: 1.7 }} value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>

        <button onClick={send} disabled={busy} style={{ ...goldBtn, width: "100%" }}>
          {busy ? "Sending…" : "Send email"}
        </button>

        {msg && (
          <div style={{
            marginTop: 12, fontSize: 13, lineHeight: 1.6, borderRadius: 10, padding: "10px 12px",
            color: msg.ok ? "#4ade80" : "#ff6b6b",
            background: msg.ok ? "rgba(74,222,128,0.1)" : "rgba(255,107,107,0.1)",
            border: `1px solid ${msg.ok ? "rgba(74,222,128,0.35)" : "rgba(255,107,107,0.35)"}`,
          }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// INBOX
// ===========================================================================
function Inbox({ api, onCount }: { api: ApiFn; onCount: (n: number) => void }) {
  const [threads, setThreads] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [froms, setFroms] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api("/email/admin/threads", "GET")
      .then((r) => { setThreads(r?.threads || []); onCount(r?.waiting || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []); // eslint-disable-line

  useEffect(() => {
    api("/email/admin/from-options").then((r) => {
      const o = r?.options || [];
      setFroms(o); setFrom(o[0] || "");
    }).catch(() => {});
  }, []); // eslint-disable-line

  async function openThread(t: any) {
    setOpen(t); setMessages([]); setReply("");
    try {
      const r = await api(`/email/admin/threads/${t.id}`, "GET");
      setMessages(r?.messages || []);
      setOpen(r?.thread || t);
    } catch {}
  }

  async function sendReply() {
    if (!reply.trim() || !open) return;
    setBusy(true);
    try {
      await api(`/email/admin/threads/${open.id}/reply`, "POST", { body: reply, from_email: from });
      setReply("");
      openThread(open);
      load();
    } catch (e: any) { alert(e?.message || "Reply nahi gaya."); }
    finally { setBusy(false); }
  }

  if (open) {
    return (
      <div>
        <button onClick={() => { setOpen(null); load(); }} style={{ ...ghostBtn, marginBottom: 12 }}>
          ← All conversations
        </button>

        <div style={{ ...cardBox, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{open.contact_name || open.contact_email}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
            {open.contact_email} · {open.label}
          </div>
        </div>

        {messages.map((m) => {
          const mine = m.direction === "out";
          return (
            <div
              key={m.id}
              style={{
                background: mine ? "rgba(255,171,0,0.07)" : CARD,
                border: `1px solid ${mine ? BORDER : "rgba(255,255,255,0.12)"}`,
                borderRadius: 12, padding: 13, marginBottom: 10,
                marginLeft: mine ? 24 : 0, marginRight: mine ? 0 : 24,
              }}
            >
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>
                {mine ? `You (${m.from_email})` : m.from_email}
                {m.created_at ? ` · ${new Date(m.created_at).toLocaleString("en-IN")}` : ""}
              </div>
              {m.subject && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{m.subject}</div>}
              <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#e0dacb" }}>
                {m.body_text || "(no text)"}
              </div>
            </div>
          );
        })}

        <div style={{ ...cardBox, marginTop: 14 }}>
          <Field label="Reply">
            <textarea rows={8} style={{ ...inputStyle, lineHeight: 1.7 }} value={reply}
                      onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" />
          </Field>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select style={{ ...inputStyle, flex: 1, minWidth: 180 }} value={from}
                    onChange={(e) => setFrom(e.target.value)}>
              {froms.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <button onClick={sendReply} disabled={busy || !reply.trim()} style={goldBtn}>
              {busy ? "Sending…" : "Send reply"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={load} style={ghostBtn}>Refresh</button>
      </div>

      {loading ? (
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      ) : threads.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6 }}>
          No conversations yet. Send one from Compose, or wait for a reply to land here.
        </p>
      ) : (
        threads.map((t) => {
          const waiting = t.last_direction === "in";
          return (
            <div
              key={t.id}
              onClick={() => openThread(t)}
              style={{
                background: CARD, borderRadius: 12, padding: 13, marginBottom: 10, cursor: "pointer",
                border: `1px solid ${waiting ? "rgba(255,107,107,0.4)" : BORDER}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.contact_name || t.contact_email}
                </div>
                {waiting && (
                  <span style={{ fontSize: 10, fontWeight: 900, color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)", background: "rgba(255,107,107,0.14)", borderRadius: 6, padding: "1px 6px" }}>
                    REPLY PENDING
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.subject || "(no subject)"} · {t.label}
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                {t.last_message_at ? new Date(t.last_message_at).toLocaleString("en-IN") : ""}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
