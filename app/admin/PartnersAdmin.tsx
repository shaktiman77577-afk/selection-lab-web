"use client";

/**
 * PartnersAdmin.tsx — admin: partner program.
 *
 * Teen tab:
 *   Partners  — applications aur chalte hue partners. Nayi application sabse
 *               upar, kyunki wahi roz dekhni hoti hai.
 *   Payouts   — kisko kitna bhejna hai, UPI ke saath. Aap UPI se bhejiye aur
 *               yahan "Mark as paid" dabaiye.
 *   Requests  — content ki farmaishein.
 *
 * app/admin/page.tsx me "partners" tab ke roop me judta hai.
 * Base: /partner/admin
 */

import { useState, useEffect, type ReactNode, type CSSProperties } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const GREEN = "#4ade80";
const RED = "#ff6b6b";

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
  background: "transparent", color: RED, border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const cardBox: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 };
const rowCard: CSSProperties = { ...cardBox, marginBottom: 10 };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

function Badge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending: ["NEW APPLICATION", GOLD],
    active: ["ACTIVE", GREEN],
    paused: ["PAUSED", MUTED],
    rejected: ["REJECTED", RED],
    requested: ["WAITING", GOLD],
    paid: ["PAID", GREEN],
    received: ["NEW", GOLD],
    in_progress: ["IN PROGRESS", GOLD],
    done: ["DONE", GREEN],
    declined: ["NOT PLANNED", MUTED],
  };
  const [label, color] = map[status] || [status, MUTED];
  return (
    <span style={{
      fontSize: 10, fontWeight: 900, color, border: `1px solid ${color}`,
      borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ===========================================================================
export default function PartnersAdmin({ api }: { api: ApiFn }) {
  const [tab, setTab] = useState<"partners" | "payouts" | "requests">("partners");
  const [counts, setCounts] = useState({ pending: 0, payouts: 0, requests: 0 });

  function loadCounts() {
    api("/partner/admin/list", "GET")
      .then((r) => setCounts((c) => ({
        ...c, pending: (r?.collaborators || []).filter((x: any) => x.status === "pending").length,
      }))).catch(() => {});
    api("/partner/admin/payouts/pending", "GET")
      .then((r) => setCounts((c) => ({ ...c, payouts: (r?.payouts || []).length }))).catch(() => {});
    api("/partner/admin/requests", "GET")
      .then((r) => setCounts((c) => ({
        ...c, requests: (r?.requests || []).filter((x: any) => x.status === "received").length,
      }))).catch(() => {});
  }
  useEffect(loadCounts, []); // eslint-disable-line

  const tabs = [
    ["partners", "Partners", counts.pending],
    ["payouts", "Payouts", counts.payouts],
    ["requests", "Requests", counts.requests],
  ] as const;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Partners</h2>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(([k, label, n]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            style={{
              padding: "8px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              border: `1px solid ${tab === k ? GOLD : BORDER}`,
              background: tab === k ? GOLD : "transparent",
              color: tab === k ? "#1a1a1a" : "#fff",
            }}
          >
            {label}
            {n > 0 && (
              <span style={{ marginLeft: 6, background: RED, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
                {n}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "partners" && <Partners api={api} onChange={loadCounts} />}
      {tab === "payouts" && <Payouts api={api} onChange={loadCounts} />}
      {tab === "requests" && <Requests api={api} onChange={loadCounts} />}
    </div>
  );
}

// ===========================================================================
// PARTNERS
// ===========================================================================
function Partners({ api, onChange }: { api: ApiFn; onChange: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approve, setApprove] = useState<any>(null);
  const [newPass, setNewPass] = useState<{ name: string; password: string } | null>(null);

  function load() {
    setLoading(true);
    api("/partner/admin/list", "GET")
      .then((r) => setRows(r?.collaborators || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []); // eslint-disable-line

  async function reject(c: any) {
    const note = prompt(`Reject ${c.name}? You can add a short reason (they will not see it).`);
    if (note === null) return;
    await api(`/partner/admin/${c.id}/reject`, "POST", { note });
    load(); onChange();
  }

  async function pause(c: any) {
    await api(`/partner/admin/${c.id}`, "PUT", {
      ...c, status: c.status === "paused" ? "active" : "paused",
    });
    load();
  }

  async function resetPassword(c: any) {
    if (!confirm(`Reset the password for ${c.name}? The old one stops working.`)) return;
    const r = await api(`/partner/admin/${c.id}/reset-password`, "POST", {});
    setNewPass({ name: c.name, password: r.password });
  }

  return (
    <div>
      {newPass && (
        <div style={{ ...cardBox, marginBottom: 14, borderColor: GREEN }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: GREEN }}>
            New password for {newPass.name}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", margin: "8px 0" }}>
            {newPass.password}
          </div>
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
            Send this to them now. It is shown once and is not stored anywhere —
            only its hash is saved, so it cannot be shown again.
          </div>
          <button onClick={() => setNewPass(null)} style={{ ...ghostBtn, marginTop: 10 }}>Done</button>
        </div>
      )}

      {approve && (
        <ApproveForm
          c={approve}
          api={api}
          onDone={() => { setApprove(null); load(); onChange(); }}
          onCancel={() => setApprove(null)}
        />
      )}

      {loading ? (
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13.5 }}>No partners yet.</p>
      ) : (
        rows.map((c) => (
          <div key={c.id} style={{ ...rowCard, borderColor: c.status === "pending" ? GOLD : BORDER }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {c.name} <Badge status={c.status} />
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                  {c.email}{c.phone ? ` · ${c.phone}` : ""}
                </div>
                {c.channel_url && (
                  <a href={c.channel_url} target="_blank" rel="noreferrer"
                     style={{ fontSize: 11.5, color: GOLD, fontWeight: 700 }}>
                    {c.platform || "channel"}
                    {c.subscribers ? ` · ${Number(c.subscribers).toLocaleString("en-IN")} subs` : ""} ↗
                  </a>
                )}
              </div>
              {c.status === "active" && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: GOLD }}>
                    ₹{Number(c.earned || 0).toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>
                    {c.sales || 0} sales · ₹{Number(c.pending || 0).toLocaleString("en-IN")} pending
                  </div>
                </div>
              )}
            </div>

            {c.about && (
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>{c.about}</div>
            )}

            {c.payout_requested && (
              <div style={{ fontSize: 12, fontWeight: 800, color: RED, marginTop: 8 }}>
                Payout requested — see the Payouts tab
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {c.status === "pending" ? (
                <>
                  <button onClick={() => setApprove(c)} style={goldBtn}>Approve</button>
                  <button onClick={() => reject(c)} style={dangerBtn}>Reject</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: MUTED, alignSelf: "center", marginRight: "auto" }}>
                    {c.commission_percent}% commission · up to {c.max_discount_percent}% discount
                  </span>
                  <button onClick={() => resetPassword(c)} style={ghostBtn}>Reset password</button>
                  <button onClick={() => pause(c)} style={ghostBtn}>
                    {c.status === "paused" ? "Reactivate" : "Pause"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ApproveForm({ c, api, onDone, onCancel }: any) {
  // Code apne aap sujhaate hain — naam se, taaki wo apne channel se juda lage
  const guess = (c.name || "").split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8);
  const [f, setF] = useState({
    commission_percent: 40, max_discount_percent: 25,
    coupon_code: guess ? `${guess}20` : "", discount_value: 20, note: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const price = 499;
  const paid = Math.round(price * (1 - Number(f.discount_value) / 100));
  const theirs = Math.round(paid * Number(f.commission_percent) / 100);

  async function go() {
    setBusy(true); setErr("");
    try {
      await api(`/partner/admin/${c.id}/approve`, "POST", {
        ...f,
        commission_percent: Number(f.commission_percent),
        max_discount_percent: Number(f.max_discount_percent),
        discount_value: Number(f.discount_value),
      });
      onDone();
    } catch (e: any) { setErr(e?.message || "Could not approve"); }
    setBusy(false);
  }

  return (
    <div style={{ ...cardBox, marginBottom: 14, borderColor: GOLD }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Approve {c.name}</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
        This creates their coupon and sends them an email with the code and their commission.
        The coupon is private — it never shows up in the coupon list on the payment page.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Field label="Coupon code" hint="They will share this with their audience">
          <input style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }}
                 value={f.coupon_code}
                 onChange={(e) => setF({ ...f, coupon_code: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Starting discount (%)">
          <input type="number" style={inputStyle} value={f.discount_value}
                 onChange={(e) => setF({ ...f, discount_value: e.target.value as any })} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Field label="Commission (%)" hint="Of the amount actually received">
          <input type="number" style={inputStyle} value={f.commission_percent}
                 onChange={(e) => setF({ ...f, commission_percent: e.target.value as any })} />
        </Field>
        <Field label="Max discount (%)" hint="They can change their discount up to this">
          <input type="number" style={inputStyle} value={f.max_discount_percent}
                 onChange={(e) => setF({ ...f, max_discount_percent: e.target.value as any })} />
        </Field>
      </div>

      <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 10, padding: 12, fontSize: 12.5, lineHeight: 1.8, marginBottom: 12 }}>
        On a ₹{price} course: student pays <b style={{ color: "#e0dacb" }}>₹{paid}</b>,
        partner gets <b style={{ color: GOLD }}>₹{theirs}</b>,
        you keep <b style={{ color: GREEN }}>₹{paid - theirs}</b> before payment fees.
      </div>

      <Field label="Note (optional)" hint="Only you see this">
        <input style={inputStyle} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>

      {err && <div style={{ color: RED, fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={go} disabled={busy} style={goldBtn}>
          {busy ? "Approving…" : "Approve and create coupon"}
        </button>
        <button onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}

// ===========================================================================
// PAYOUTS
// ===========================================================================
function Payouts({ api, onChange }: { api: ApiFn; onChange: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pay, setPay] = useState<any>(null);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api("/partner/admin/payouts/pending", "GET")
      .then((r) => setRows(r?.payouts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []); // eslint-disable-line

  async function markPaid() {
    setBusy(true);
    try {
      await api(`/partner/admin/payouts/${pay.id}/paid`, "POST", { reference: ref });
      setPay(null); setRef(""); load(); onChange();
    } catch (e: any) { alert(e?.message || "Could not save"); }
    setBusy(false);
  }

  async function reject(p: any) {
    const note = prompt("Why is this being rejected? The partner will see this.");
    if (note === null) return;
    await api(`/partner/admin/payouts/${p.id}/reject`, "POST", { admin_note: note });
    load(); onChange();
  }

  if (loading) return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;
  if (rows.length === 0) {
    return <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6 }}>
      Nothing to pay right now. Requests show up here as partners make them.
    </p>;
  }

  return (
    <div>
      <div style={{ ...cardBox, marginBottom: 14, fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>
        Send the money over UPI yourself, then mark it paid here with the reference number.
        The partner sees the reference on their dashboard.
      </div>

      {rows.map((p) => (
        <div key={p.id} style={rowCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>{p.name}</div>
              <div style={{ fontSize: 12.5, color: "#e0dacb", fontFamily: "monospace", marginTop: 4 }}>
                {p.upi_id}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                Requested {p.requested_at ? new Date(p.requested_at).toLocaleDateString("en-IN") : ""}
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: GOLD, flexShrink: 0 }}>
              ₹{Number(p.amount).toLocaleString("en-IN")}
            </div>
          </div>

          {pay?.id === p.id ? (
            <div style={{ marginTop: 12 }}>
              <Field label="UPI reference number">
                <input style={inputStyle} value={ref} onChange={(e) => setRef(e.target.value)}
                       placeholder="e.g. 442918273645" />
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={markPaid} disabled={busy} style={goldBtn}>
                  {busy ? "Saving…" : "Confirm paid"}
                </button>
                <button onClick={() => setPay(null)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => { navigator.clipboard?.writeText(p.upi_id || ""); }}
                style={ghostBtn}
              >
                Copy UPI
              </button>
              <button onClick={() => { setPay(p); setRef(""); }} style={goldBtn}>Mark as paid</button>
              <button onClick={() => reject(p)} style={dangerBtn}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===========================================================================
// CONTENT REQUESTS
// ===========================================================================
function Requests({ api, onChange }: { api: ApiFn; onChange: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any>(null);
  const [f, setF] = useState({ status: "in_progress", admin_note: "", result_url: "" });

  function load() {
    setLoading(true);
    api("/partner/admin/requests", "GET")
      .then((r) => setRows(r?.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []); // eslint-disable-line

  function open(r: any) {
    setEdit(r);
    setF({ status: r.status || "received", admin_note: r.admin_note || "", result_url: r.result_url || "" });
  }

  async function save() {
    await api(`/partner/admin/requests/${edit.id}`, "PUT", f);
    setEdit(null); load(); onChange();
  }

  if (loading) return <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>;
  if (rows.length === 0) {
    return <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6 }}>
      No requests yet. Partners can ask for content from their dashboard.
    </p>;
  }

  return (
    <div>
      <div style={{ ...cardBox, marginBottom: 14, fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>
        These come from people who teach this exam every day. Even a short reply keeps them
        sending more — a request that never gets an answer is the last one you receive.
      </div>

      {rows.map((r) => (
        <div key={r.id} style={{ ...rowCard, borderColor: r.status === "received" ? GOLD : BORDER }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{r.title}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                {r.collaborator_name} · {r.kind}
                {r.exam_name ? ` · ${r.exam_name}` : ""}
                {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString("en-IN")}` : ""}
              </div>
            </div>
            <Badge status={r.status} />
          </div>

          {r.details && (
            <div style={{ fontSize: 12.5, color: "#e0dacb", marginTop: 10, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {r.details}
            </div>
          )}
          {r.file_url && (
            <a href={r.file_url} target="_blank" rel="noreferrer"
               style={{ fontSize: 12.5, color: GOLD, fontWeight: 700, display: "inline-block", marginTop: 8 }}>
              Open the source they shared ↗
            </a>
          )}

          {edit?.id === r.id ? (
            <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              <Field label="Status">
                <select style={inputStyle} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                  <option value="received">Received</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                  <option value="declined">Not planned</option>
                </select>
              </Field>
              <Field label="Reply" hint="The partner sees this on their dashboard">
                <textarea rows={3} style={{ ...inputStyle, lineHeight: 1.6 }} value={f.admin_note}
                          onChange={(e) => setF({ ...f, admin_note: e.target.value })} />
              </Field>
              <Field label="Link to what you built (optional)">
                <input style={inputStyle} value={f.result_url} placeholder="/tier2?s=2"
                       onChange={(e) => setF({ ...f, result_url: e.target.value })} />
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={save} style={goldBtn}>Save</button>
                <button onClick={() => setEdit(null)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              {r.admin_note && (
                <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8, lineHeight: 1.6 }}>
                  Your reply: {r.admin_note}
                </div>
              )}
              <button onClick={() => open(r)} style={ghostBtn}>Update</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
