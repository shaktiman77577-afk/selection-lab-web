"use client";

/**
 * DescriptiveAdmin.tsx  --  Selection Lab admin: Descriptive Writing Tests
 * Matches the admin panel's dark inline-style theme.
 * Wired into app/admin/page.tsx as the "descriptive" tab: <DescriptiveAdmin api={api} />
 *
 * Endpoints (base = /admin-extra/desc):
 *   GET/POST/PUT/DELETE /series   ·   GET /tests/:seriesId  POST /tests  DELETE /tests/:id
 *   GET /questions/:testId  POST /questions  DELETE /questions/:id
 */

import { useState, useEffect, type ReactNode, type CSSProperties } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const Q_TYPES = ["Essay", "Precis", "Letter"];

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};
const goldBtn: CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "11px 16px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  background: "transparent",
  color: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "8px 13px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
const dangerBtn: CSSProperties = {
  background: "transparent",
  color: "#ff6b6b",
  border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 8,
  padding: "7px 12px",
  fontWeight: 700,
  fontSize: 12.5,
  cursor: "pointer",
};
const cardBox: CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: 14,
};
const rowCard: CSSProperties = {
  ...cardBox,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 10,
};

function asArray(res: any, ...keys: string[]): any[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  for (const k of keys) if (res && Array.isArray(res[k])) return res[k];
  return [];
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

// ===========================================================================
export default function DescriptiveAdmin({ api }: { api: ApiFn }) {
  const [level, setLevel] = useState<"series" | "tests" | "questions">("series");
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [testList, setTestList] = useState<any[]>([]);
  const [questionList, setQuestionList] = useState<any[]>([]);
  const [activeSeries, setActiveSeries] = useState<any>(null);
  const [activeTest, setActiveTest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadSeries() {
    setLoading(true); setError("");
    try {
      const res = await api("/admin-extra/desc/series", "GET");
      setSeriesList(asArray(res, "series"));
    } catch (e: any) { setError(e?.message || "Could not load series."); }
    finally { setLoading(false); }
  }
  async function loadTests(seriesId: number) {
    setLoading(true); setError("");
    try {
      const res = await api(`/admin-extra/desc/tests/${seriesId}`, "GET");
      setTestList(asArray(res, "tests"));
    } catch (e: any) { setError(e?.message || "Could not load tests."); }
    finally { setLoading(false); }
  }
  async function loadQuestions(testId: number) {
    setLoading(true); setError("");
    try {
      const res = await api(`/admin-extra/desc/questions/${testId}`, "GET");
      setQuestionList(asArray(res, "questions"));
    } catch (e: any) { setError(e?.message || "Could not load questions."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadSeries(); /* eslint-disable-next-line */ }, []);

  function openSeries(s: any) { setActiveSeries(s); setLevel("tests"); loadTests(s.id); }
  function openTest(t: any) { setActiveTest(t); setLevel("questions"); loadQuestions(t.id); }
  function backToSeries() { setActiveSeries(null); setActiveTest(null); setLevel("series"); }
  function backToTests() { setActiveTest(null); setLevel("tests"); }

  const crumbBtn = (active: boolean): CSSProperties => ({
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontSize: 13, fontWeight: active ? 800 : 600, color: active ? "#fff" : MUTED,
  });

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Descriptive Writing Tests</h2>

      {/* breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={backToSeries} style={crumbBtn(level === "series")}>Series</button>
        {activeSeries && (<>
          <span style={{ color: MUTED }}>/</span>
          <button onClick={backToTests} style={crumbBtn(level === "tests")}>{activeSeries.title}</button>
        </>)}
        {activeTest && (<>
          <span style={{ color: MUTED }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{activeTest.title}</span>
        </>)}
      </div>

      {error ? (
        <p style={{ color: "#ff6b6b", fontSize: 13, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>{error}</p>
      ) : null}

      {loading ? (
        <p style={{ color: MUTED, fontSize: 14 }}>Loading…</p>
      ) : level === "series" ? (
        <SeriesLevel api={api} list={seriesList} busy={busy} setBusy={setBusy} reload={loadSeries} onOpen={openSeries} />
      ) : level === "tests" ? (
        <TestsLevel api={api} series={activeSeries} list={testList} busy={busy} setBusy={setBusy} reload={() => loadTests(activeSeries.id)} onOpen={openTest} />
      ) : (
        <QuestionsLevel api={api} test={activeTest} list={questionList} busy={busy} setBusy={setBusy} reload={() => loadQuestions(activeTest.id)} />
      )}
    </div>
  );
}

// ===========================================================================
// SERIES
// ===========================================================================
function SeriesLevel(props: {
  api: ApiFn; list: any[]; busy: boolean; setBusy: (b: boolean) => void; reload: () => void; onOpen: (s: any) => void;
}) {
  const { api, list, busy, setBusy, reload, onOpen } = props;
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(blank());

  function blank() {
    return { title: "", description: "", thumbnail_url: "", price: 0, original_price: 0, validity_days: 180, is_active: true, display_order: 0 };
  }
  function startEdit(s: any) {
    setEditId(s.id);
    setForm({
      title: s.title || "", description: s.description || "", thumbnail_url: s.thumbnail_url || "",
      price: s.price ?? 0, original_price: s.original_price ?? 0, validity_days: s.validity_days ?? 180,
      is_active: s.is_active ?? true, display_order: s.display_order ?? 0,
    });
    setShowForm(true);
  }
  async function save() {
    if (!form.title.trim()) return alert("Series title is required.");
    setBusy(true);
    try {
      const body = {
        ...form,
        price: Number(form.price) || 0,
        original_price: Number(form.original_price) || 0,
        validity_days: Number(form.validity_days) || 180,
        display_order: Number(form.display_order) || 0,
      };
      if (editId) await api(`/admin-extra/desc/series/${editId}`, "PUT", body);
      else await api("/admin-extra/desc/series", "POST", body);
      setForm(blank()); setEditId(null); setShowForm(false); reload();
    } catch (e: any) { alert(e?.message || "Could not save series."); }
    finally { setBusy(false); }
  }
  async function remove(s: any) {
    if (!confirm(`Delete series "${s.title}" and its tests?`)) return;
    setBusy(true);
    try { await api(`/admin-extra/desc/series/${s.id}`, "DELETE"); reload(); }
    catch (e: any) { alert(e?.message || "Could not delete series."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={() => { setEditId(null); setForm(blank()); setShowForm(!showForm); }} style={{ ...goldBtn, marginBottom: 14 }}>
        {showForm ? "Close form" : "+ Add series"}
      </button>

      {showForm ? (
        <div style={{ ...cardBox, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{editId ? "Edit series" : "New series"}</h3>
          <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Thumbnail URL"><input style={inputStyle} value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Price (₹)" hint="0 = free"><input type="number" style={inputStyle} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="MRP (₹)" hint="strike-through"><input type="number" style={inputStyle} value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Validity (days)"><input type="number" style={inputStyle} value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: e.target.value })} /></Field>
            <Field label="Display order"><input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></Field>
          </div>
          <Field label="Description"><textarea rows={2} style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, margin: "4px 0 12px", cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active (visible to students)
          </label>
          <button onClick={save} disabled={busy} style={{ ...goldBtn, width: "100%" }}>{busy ? "Saving…" : editId ? "Save changes" : "Create series"}</button>
        </div>
      ) : null}

      {list.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 14 }}>No series yet. Add one to get started.</p>
      ) : (
        list.map((s) => (
          <div key={s.id} style={rowCard}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {s.title}{" "}
                {!s.is_active ? <span style={{ fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>HIDDEN</span> : null}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {Number(s.price) > 0 ? `₹${s.price}` : "Free"} · {s.validity_days ?? 180}d
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => onOpen(s)} style={ghostBtn}>Tests →</button>
              <button onClick={() => startEdit(s)} style={ghostBtn}>Edit</button>
              <button onClick={() => remove(s)} style={dangerBtn}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ===========================================================================
// TESTS
// ===========================================================================
function TestsLevel(props: {
  api: ApiFn; series: any; list: any[]; busy: boolean; setBusy: (b: boolean) => void; reload: () => void; onOpen: (t: any) => void;
}) {
  const { api, series, list, busy, setBusy, reload, onOpen } = props;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(blank());

  function blank() { return { title: "", duration_min: 30, is_free: false, display_order: 0 }; }
  async function save() {
    if (!form.title.trim()) return alert("Test title is required.");
    setBusy(true);
    try {
      await api("/admin-extra/desc/tests", "POST", {
        series_id: series.id, title: form.title,
        duration_min: Number(form.duration_min) || 30,
        is_free: !!form.is_free, display_order: Number(form.display_order) || 0,
      });
      setForm(blank()); setShowForm(false); reload();
    } catch (e: any) { alert(e?.message || "Could not save test."); }
    finally { setBusy(false); }
  }
  async function remove(t: any) {
    if (!confirm(`Delete test "${t.title}" and its questions?`)) return;
    setBusy(true);
    try { await api(`/admin-extra/desc/tests/${t.id}`, "DELETE"); reload(); }
    catch (e: any) { alert(e?.message || "Could not delete test."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={() => setShowForm(!showForm)} style={{ ...goldBtn, marginBottom: 14 }}>{showForm ? "Close form" : "+ Add test"}</button>

      {showForm ? (
        <div style={{ ...cardBox, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>New test</h3>
          <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Duration (min)"><input type="number" style={inputStyle} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></Field>
            <Field label="Display order"><input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, margin: "4px 0 12px", cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
            Free test (first test is usually free)
          </label>
          <button onClick={save} disabled={busy} style={{ ...goldBtn, width: "100%" }}>{busy ? "Saving…" : "Create test"}</button>
        </div>
      ) : null}

      {list.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 14 }}>No tests in this series yet.</p>
      ) : (
        list.map((t) => (
          <div key={t.id} style={rowCard}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                {t.title}{" "}
                <span style={{ fontSize: 10, color: t.is_free ? "#5dd97c" : MUTED, border: `1px solid ${t.is_free ? "rgba(93,217,124,0.4)" : BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>
                  {t.is_free ? "FREE" : "PAID"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t.duration_min ?? 30} min</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => onOpen(t)} style={ghostBtn}>Questions →</button>
              <button onClick={() => remove(t)} style={dangerBtn}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ===========================================================================
// QUESTIONS
// ===========================================================================
function QuestionsLevel(props: {
  api: ApiFn; test: any; list: any[]; busy: boolean; setBusy: (b: boolean) => void; reload: () => void;
}) {
  const { api, test, list, busy, setBusy, reload } = props;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(blank());

  function blank() {
    return { q_type: "Essay", question: "", word_limit: 250, sample_answer: "", max_word_marks: 5, max_spelling_marks: 10, max_grammar_marks: 10, display_order: 0 };
  }
  const totalMarks = (Number(form.max_word_marks) || 0) + (Number(form.max_spelling_marks) || 0) + (Number(form.max_grammar_marks) || 0);

  async function save() {
    if (!form.question.trim()) return alert("Question text is required.");
    setBusy(true);
    try {
      await api("/admin-extra/desc/questions", "POST", {
        test_id: test.id, q_type: form.q_type, question: form.question,
        word_limit: Number(form.word_limit) || 250, sample_answer: form.sample_answer,
        max_word_marks: Number(form.max_word_marks) || 0,
        max_spelling_marks: Number(form.max_spelling_marks) || 0,
        max_grammar_marks: Number(form.max_grammar_marks) || 0,
        marks: totalMarks, display_order: Number(form.display_order) || 0,
      });
      setForm(blank()); setShowForm(false); reload();
    } catch (e: any) { alert(e?.message || "Could not save question."); }
    finally { setBusy(false); }
  }
  async function remove(q: any) {
    if (!confirm("Delete this question?")) return;
    setBusy(true);
    try { await api(`/admin-extra/desc/questions/${q.id}`, "DELETE"); reload(); }
    catch (e: any) { alert(e?.message || "Could not delete question."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={() => setShowForm(!showForm)} style={{ ...goldBtn, marginBottom: 14 }}>{showForm ? "Close form" : "+ Add question"}</button>

      {showForm ? (
        <div style={{ ...cardBox, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>New question</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Type">
              <select style={inputStyle} value={form.q_type} onChange={(e) => setForm({ ...form, q_type: e.target.value })}>
                {Q_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Word limit (target)"><input type="number" style={inputStyle} value={form.word_limit} onChange={(e) => setForm({ ...form, word_limit: e.target.value })} /></Field>
          </div>
          <Field label="Question"><textarea rows={2} style={inputStyle} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
          <Field label="Sample / model answer" hint="Shown to student after submit for comparison."><textarea rows={5} style={inputStyle} value={form.sample_answer} onChange={(e) => setForm({ ...form, sample_answer: e.target.value })} /></Field>

          <div style={{ background: "rgba(255,171,0,0.07)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>Auto-score marks · total {totalMarks}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Word"><input type="number" style={inputStyle} value={form.max_word_marks} onChange={(e) => setForm({ ...form, max_word_marks: e.target.value })} /></Field>
              <Field label="Spelling"><input type="number" style={inputStyle} value={form.max_spelling_marks} onChange={(e) => setForm({ ...form, max_spelling_marks: e.target.value })} /></Field>
              <Field label="Grammar"><input type="number" style={inputStyle} value={form.max_grammar_marks} onChange={(e) => setForm({ ...form, max_grammar_marks: e.target.value })} /></Field>
            </div>
          </div>
          <Field label="Display order"><input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></Field>
          <button onClick={save} disabled={busy} style={{ ...goldBtn, width: "100%" }}>{busy ? "Saving…" : "Create question"}</button>
        </div>
      ) : null}

      {list.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 14 }}>No questions in this test yet.</p>
      ) : (
        list.map((q, i) => (
          <div key={q.id} style={{ ...cardBox, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: GOLD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 7px" }}>{q.q_type || "Essay"}</span>
                  <span style={{ fontSize: 11.5, color: MUTED, marginLeft: 6 }}>Q{i + 1}</span>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{q.question}</div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>
                  {q.word_limit ?? 250} words · W{q.max_word_marks ?? 0}/S{q.max_spelling_marks ?? 0}/G{q.max_grammar_marks ?? 0}
                </div>
              </div>
              <button onClick={() => remove(q)} style={{ ...dangerBtn, flexShrink: 0 }}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
