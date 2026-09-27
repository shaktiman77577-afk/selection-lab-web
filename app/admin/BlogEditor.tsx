"use client";

/**
 * app/admin/BlogEditor.tsx — blog ka naya editor (Word jaisa) + SEO box.
 *
 * KYUN:
 * Pehle blog ek saada text box tha jisme "## heading", "[text](link)" jaisa
 * code likhna padta tha — SEO wale ke liye mushkil. Ab toolbar hai: heading,
 * bold, rang, table (Excel ki tarah), button (link picker ke saath), image,
 * YouTube. Jo yahan dikhta hai wahi website par chhapta hai.
 *
 * KOI NAYA PACKAGE NAHI:
 * Browser ka apna contentEditable + execCommand. Chrome/Android/Safari sab me
 * chalta hai. HTML backend par saaf hota hai (core/html_clean.py) — script,
 * onclick jaisi cheez kabhi website tak nahi pahunchti.
 *
 * PURANI POSTS:
 * "md" format wali post khulte hi HTML me badal jaati hai (lib/blogHtml
 * mdToHtml). Save karne par nayi format me jaati hai. Bina save kiye website
 * par wo pehle jaisi hi dikhti rehti hai.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "@/lib/config";
import ImageField from "./ImageField";
import {
  BLOG_CSS, GOLD, buttonHtml, cleanPasted, esc, mdToHtml, seoCheck, tableHtml, textOn, youtubeEmbed,
} from "@/lib/blogHtml";

type Api = (path: string, method?: string, body?: any) => Promise<any>;
type Faq = { q: string; a: string };

const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const SWATCHES = ["#000000", "#c0392b", "#e67e22", GOLD, "#1c7a3e", "#2563a8", "#7c3aed", "#ffffff"];
const HIGHLIGHTS = ["#fff3b0", "#ffd6d6", "#d6f5dd", "#d6e8ff", "#f1e0ff", "#ffe6c7", GOLD, "transparent"];
const BTN_COLORS = [GOLD, "#1c7a3e", "#2563a8", "#c0392b", "#111111", "#7c3aed"];

const input: React.CSSProperties = {
  width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 14, boxSizing: "border-box",
};
const label: React.CSSProperties = { fontSize: 12.5, color: MUTED, margin: "12px 0 5px", display: "block" };
const gold: React.CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "12px 18px",
  fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghost: React.CSSProperties = {
  background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8,
  padding: "7px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

// ═══════════════════════════════════════════════════════════════════════════
export default function BlogEditor({ api, post, onBack, onSaved }: {
  api: Api; post: any; onBack: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState<string>(post.title || "");
  const [slug, setSlug] = useState<string>(post.slug || "");
  const [slugTouched, setSlugTouched] = useState<boolean>(!!post.id);
  const [metaTitle, setMetaTitle] = useState<string>(post.meta_title || "");
  const [metaDesc, setMetaDesc] = useState<string>(post.meta_description || post.excerpt || "");
  const [keyword, setKeyword] = useState<string>(post.focus_keyword || "");
  const [cover, setCover] = useState<string>(post.cover_url || "");
  const [coverAlt, setCoverAlt] = useState<string>(post.cover_alt || "");
  const [faqs, setFaqs] = useState<Faq[]>(Array.isArray(post.faqs) ? post.faqs : []);
  const [published, setPublished] = useState<boolean>(post.is_published !== false);
  const [html, setHtml] = useState<string>(() =>
    post.content_format === "html" ? (post.content || "") : mdToHtml(post.content || ""));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<"write" | "seo">("write");

  const effSlug = slugTouched ? slugify(slug) : slugify(title);
  const seo = useMemo(() => seoCheck({
    title, metaTitle, metaDesc, slug: effSlug, keyword, html, cover, coverAlt, faqs,
  }), [title, metaTitle, metaDesc, effSlug, keyword, html, cover, coverAlt, faqs]);

  async function save() {
    setMsg(null);
    if (!title.trim()) { setMsg({ ok: false, text: "Title likhiye" }); return; }
    if (!html.replace(/<[^>]+>|&nbsp;/g, "").trim()) { setMsg({ ok: false, text: "Post khaali hai" }); return; }
    setSaving(true);
    try {
      const body = {
        title: title.trim(), slug: effSlug || null, excerpt: metaDesc.trim() || null,
        content: html, content_format: "html", cover_url: cover.trim() || null,
        is_published: published, meta_title: metaTitle.trim() || null,
        meta_description: metaDesc.trim() || null, focus_keyword: keyword.trim() || null,
        cover_alt: coverAlt.trim() || null,
        faqs: faqs.filter((f) => f.q.trim() && f.a.trim()),
      };
      const d = post.id
        ? await api(`/admin-extra/blog/${post.id}`, "PUT", body)
        : await api("/admin-extra/blog", "POST", body);
      setMsg({ ok: true, text: published ? "Save ho gaya — website par live" : "Draft save ho gaya" });
      if (d?.seo_saved === false) setMsg({ ok: false, text: "Post save hui, par SEO box save nahi hua — Supabase me blog SQL chalaiye" });
      setTimeout(onSaved, 700);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Save nahi hua" });
    }
    setSaving(false);
  }

  const scoreCol = seo.score >= 80 ? "#5dd97c" : seo.score >= 50 ? GOLD : "#ff6b6b";

  return (
    <div>
      <style>{BLOG_CSS}</style>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={ghost}>← Back</button>
        <div style={{ flex: 1, fontWeight: 800, fontSize: 15 }}>{post.id ? "Post edit" : "Nayi post"}</div>
        <div title="SEO score" style={{ border: `2px solid ${scoreCol}`, color: scoreCol, borderRadius: 999,
          padding: "3px 10px", fontWeight: 800, fontSize: 13 }}>SEO {seo.score}</div>
      </div>

      <input style={{ ...input, fontSize: 17, fontWeight: 800, padding: "13px 12px" }} value={title}
        onChange={(e) => setTitle(e.target.value)} placeholder="Post ka title — jaise: SKAU Clerk Syllabus 2026" />

      <div style={{ display: "flex", gap: 6, margin: "12px 0" }}>
        {([["write", "✍️ Likhiye"], ["seo", `📈 Google / SEO (${seo.score})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            ...ghost, flex: 1, padding: "10px", borderColor: tab === k ? GOLD : "rgba(255,255,255,0.18)",
            color: tab === k ? GOLD : "#fff", background: tab === k ? "rgba(255,171,0,0.1)" : "transparent",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: tab === "write" ? "block" : "none" }}>
        <RichEditor api={api} initial={html} onChange={setHtml} />
        <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
          {seo.words} shabd · Word / Google Docs / Excel se copy-paste bhi kar sakte hain — table aur rang saath aayenge
        </div>
      </div>

      {tab === "seo" && (
        <SeoPanel {...{ title, metaTitle, setMetaTitle, metaDesc, setMetaDesc, keyword, setKeyword,
          slug: effSlug, setSlug: (v: string) => { setSlug(v); setSlugTouched(true); },
          cover, setCover, coverAlt, setCoverAlt, faqs, setFaqs, seo }} />
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 12px", fontSize: 14 }}>
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Website par dikhao (hata do to Draft — sirf yahan dikhegi)
      </label>
      <button onClick={save} disabled={saving} style={{ ...gold, width: "100%", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Save ho raha hai…" : post.id ? "Update post" : published ? "Publish post" : "Draft save karo"}
      </button>
      {msg && (
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: msg.ok ? "#5dd97c" : "#ff6b6b" }}>{msg.text}</div>
      )}
      {post.slug && published && (
        <a href={`/blog/${effSlug}`} target="_blank" rel="noopener"
          style={{ display: "block", textAlign: "center", marginTop: 10, color: GOLD, fontSize: 13 }}>
          Website par dekhiye ↗
        </a>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Editor
// ═══════════════════════════════════════════════════════════════════════════
type ModalKind = null | "link" | "button" | "table" | "image" | "youtube";

function RichEditor({ api, initial, onChange }: { api: Api; initial: string; onChange: (h: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const saved = useRef<Range | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [cell, setCell] = useState<HTMLTableCellElement | null>(null);
  const [colorFor, setColorFor] = useState<null | "text" | "bg" | "cell">(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial || "<p><br></p>";
    try { document.execCommand("styleWithCSS", false, "true"); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => { if (ref.current) onChange(ref.current.innerHTML); };

  function saveSel() {
    const s = window.getSelection();
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) saved.current = s.getRangeAt(0).cloneRange();
  }
  function restoreSel() {
    ref.current?.focus();
    const s = window.getSelection();
    if (saved.current && s) { s.removeAllRanges(); s.addRange(saved.current); }
    else if (ref.current && s) {                    // koi jagah yaad nahi — aakhir me
      const r = document.createRange(); r.selectNodeContents(ref.current); r.collapse(false);
      s.removeAllRanges(); s.addRange(r);
    }
  }
  function cmd(name: string, value?: string) {
    restoreSel();
    try { document.execCommand("styleWithCSS", false, "true"); } catch {}
    document.execCommand(name, false, value);
    saveSel(); sync(); track();
  }
  // Button/table/image seedha DOM me — execCommand("insertHTML") Chrome me
  // inline style (button ka rang, heading row ka rang) chupchaap gira deta tha.
  function insert(h: string) {
    restoreSel();
    const s = window.getSelection();
    if (!s || !s.rangeCount || !ref.current) return;
    const r = s.getRangeAt(0);
    r.deleteContents();
    // Block cheez (table/p) ko paragraph ke beech nahi, uske baad rakhte hain
    let at: Node = r.startContainer;
    while (at.parentNode && at.parentNode !== ref.current) at = at.parentNode;
    const frag = r.createContextualFragment(h);
    const last = frag.lastChild;
    const isBlock = /^\s*<(p|table|h[2-4]|ul|ol|hr|blockquote|div)\b/i.test(h);
    if (isBlock && at !== ref.current && at.parentNode === ref.current) {
      const empty = !(at.textContent || "").trim() && !(at as Element).querySelector?.("img,iframe,table");
      if (empty) ref.current.replaceChild(frag, at);
      else ref.current.insertBefore(frag, at.nextSibling);
    } else {
      r.insertNode(frag);
    }
    if (last) {
      const nr = document.createRange();
      nr.selectNodeContents(last); nr.collapse(false);
      s.removeAllRanges(); s.addRange(nr);
    }
    saveSel(); sync(); track();
  }

  // Cursor table ke cell me hai? Tab table ke tools dikhte hain.
  function track() {
    const s = window.getSelection();
    let n: Node | null = s && s.rangeCount ? s.anchorNode : null;
    while (n && n !== ref.current) {
      if (n instanceof HTMLTableCellElement) { setCell(n); return; }
      n = n.parentNode;
    }
    setCell(null);
  }

  // ── Table ke kaam (seedha DOM par) ──
  function tableOp(op: "rowBelow" | "rowAbove" | "colRight" | "colLeft" | "delRow" | "delCol" | "delTable" | "header") {
    if (!cell) return;
    const tr = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest("table") as HTMLTableElement;
    const ci = cell.cellIndex;
    const rows = Array.from(table.rows);
    if (op === "rowBelow" || op === "rowAbove") {
      const nr = document.createElement("tr");
      Array.from(tr.cells).forEach(() => { const td = document.createElement("td"); td.innerHTML = "&nbsp;"; nr.appendChild(td); });
      tr.parentElement!.insertBefore(nr, op === "rowBelow" ? tr.nextSibling : tr);
    } else if (op === "colRight" || op === "colLeft") {
      rows.forEach((r, i) => {
        const ref0 = r.cells[Math.min(ci, r.cells.length - 1)];
        const isHead = ref0?.tagName === "TH";
        const c = document.createElement(isHead ? "th" : "td");
        c.innerHTML = isHead ? "Heading" : "&nbsp;";
        if (isHead && ref0?.getAttribute("style")) c.setAttribute("style", ref0.getAttribute("style")!);
        if (!ref0) r.appendChild(c);
        else r.insertBefore(c, op === "colRight" ? ref0.nextSibling : ref0);
        void i;
      });
    } else if (op === "delRow") {
      if (rows.length <= 1) table.remove(); else tr.remove();
    } else if (op === "delCol") {
      if (tr.cells.length <= 1) table.remove();
      else rows.forEach((r) => r.cells[ci]?.remove());
    } else if (op === "delTable") {
      table.remove();
    } else if (op === "header") {
      // Pehli row ko heading row banao / wapas normal
      const first = rows[0];
      const toTh = first.cells[0]?.tagName !== "TH";
      Array.from(first.cells).forEach((c) => {
        const n = document.createElement(toTh ? "th" : "td");
        n.innerHTML = c.innerHTML;
        if (toTh) n.setAttribute("style", `background-color: ${GOLD}; color: #1a1a1a`);
        c.replaceWith(n);
      });
    }
    // Row/column jodne ke baad bhi table ke tools khule rahein
    if (op.startsWith("del") || op === "header") setCell(null);
    sync();
  }

  function paintCell(color: string) {
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement;
    // Heading cell par rang ho to poori heading row ek saath
    const targets = cell.tagName === "TH" ? Array.from(row.cells) : [cell];
    targets.forEach((c) => {
      if (color === "transparent") { c.style.backgroundColor = ""; c.style.color = ""; }
      else { c.style.backgroundColor = color; c.style.color = textOn(color); }
    });
    sync();
  }

  function onPaste(e: React.ClipboardEvent) {
    const h = e.clipboardData.getData("text/html");
    if (!h) return;                                     // saada text — browser khud sambhal lega
    e.preventDefault();
    saveSel();
    insert(cleanPasted(h));
  }

  const open = (k: ModalKind) => { saveSel(); setModal(k); setColorFor(null); };
  const B = (p: { t: string; title: string; on: () => void; w?: number; bold?: boolean }) => (
    <button type="button" title={p.title}
      onMouseDown={(e) => { e.preventDefault(); saveSel(); }}
      onClick={p.on}
      style={{ minWidth: p.w || 34, height: 34, padding: "0 8px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13, fontWeight: p.bold ? 900 : 700, cursor: "pointer" }}>
      {p.t}
    </button>
  );
  const sep = <span style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", flexWrap: "wrap", gap: 4, padding: 6,
        background: "#1d1912", border: `1px solid ${BORDER}`, borderBottom: "none", borderRadius: "10px 10px 0 0" }}>
        <select title="Text ka prakaar" defaultValue=""
          onMouseDown={saveSel}
          onChange={(e) => { const v = e.target.value; e.target.value = ""; if (v) cmd("formatBlock", v); }}
          style={{ height: 34, borderRadius: 7, background: "#26211a", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", fontSize: 12.5 }}>
          <option value="" disabled>Style</option>
          <option value="P">Normal text</option>
          <option value="H2">Heading bada (H2)</option>
          <option value="H3">Heading chhota (H3)</option>
          <option value="BLOCKQUOTE">Highlight box</option>
        </select>
        <B t="B" bold title="Bold" on={() => cmd("bold")} />
        <B t="I" title="Italic" on={() => cmd("italic")} />
        <B t="U" title="Underline" on={() => cmd("underline")} />
        <B t="S̶" title="Strike" on={() => cmd("strikeThrough")} />
        {sep}
        <B t="A🎨" w={44} title="Text ka rang" on={() => setColorFor(colorFor === "text" ? null : "text")} />
        <B t="🖍" title="Highlight (peeche ka rang)" on={() => setColorFor(colorFor === "bg" ? null : "bg")} />
        {sep}
        <B t="⬅" title="Left" on={() => cmd("justifyLeft")} />
        <B t="↔" title="Center" on={() => cmd("justifyCenter")} />
        <B t="➡" title="Right" on={() => cmd("justifyRight")} />
        {sep}
        <B t="• List" w={50} title="Bullet list" on={() => cmd("insertUnorderedList")} />
        <B t="1. List" w={54} title="Number list" on={() => cmd("insertOrderedList")} />
        {sep}
        <B t="🔗 Link" w={58} title="Link" on={() => open("link")} />
        <B t="🔘 Button" w={72} title="Button jodo" on={() => open("button")} />
        <B t="▦ Table" w={62} title="Table jodo" on={() => open("table")} />
        <B t="🖼 Image" w={66} title="Image jodo" on={() => open("image")} />
        <B t="▶ YouTube" w={78} title="YouTube video" on={() => open("youtube")} />
        <B t="―" title="Line (divider)" on={() => insert("<hr><p><br></p>")} />
        {sep}
        <B t="↶" title="Undo" on={() => cmd("undo")} />
        <B t="↷" title="Redo" on={() => cmd("redo")} />
        <B t="⌫ Style" w={62} title="Formatting hatao" on={() => { cmd("removeFormat"); cmd("unlink"); }} />
      </div>

      {colorFor && (colorFor === "text" || colorFor === "bg") && (
        <Swatches colors={colorFor === "text" ? SWATCHES : HIGHLIGHTS}
          onPick={(c) => { cmd(colorFor === "text" ? "foreColor" : "hiliteColor", c); setColorFor(null); }} />
      )}

      {/* ── Table tools — sirf jab cursor table me ho ── */}
      {cell && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6, background: "#231d10",
          border: `1px solid ${BORDER}`, borderBottom: "none", fontSize: 12 }}>
          <span style={{ color: GOLD, fontWeight: 800, alignSelf: "center", marginRight: 4 }}>Table:</span>
          <B t="+ Row ↓" w={62} title="Neeche row" on={() => tableOp("rowBelow")} />
          <B t="+ Row ↑" w={62} title="Upar row" on={() => tableOp("rowAbove")} />
          <B t="+ Col →" w={62} title="Right column" on={() => tableOp("colRight")} />
          <B t="+ Col ←" w={62} title="Left column" on={() => tableOp("colLeft")} />
          <B t="− Row" w={52} title="Row hatao" on={() => tableOp("delRow")} />
          <B t="− Col" w={52} title="Column hatao" on={() => tableOp("delCol")} />
          <B t="Heading row" w={92} title="Pehli row heading" on={() => tableOp("header")} />
          <B t="🎨 Cell" w={60} title="Cell ka rang" on={() => setColorFor(colorFor === "cell" ? null : "cell")} />
          <B t="🗑 Table" w={66} title="Table hatao" on={() => { if (confirm("Poori table hata dein?")) tableOp("delTable"); }} />
        </div>
      )}
      {colorFor === "cell" && cell && (
        <Swatches colors={[GOLD, "#fff3b0", "#d6f5dd", "#d6e8ff", "#ffd6d6", "#1c7a3e", "#2563a8", "#c0392b", "transparent"]}
          onPick={(c) => { paintCell(c); setColorFor(null); }} />
      )}

      {/* ── Likhne ki jagah ── */}
      <div
        ref={ref}
        className="sl-blog"
        contentEditable
        suppressContentEditableWarning
        onInput={() => { sync(); }}
        onKeyUp={() => { saveSel(); track(); }}
        onMouseUp={() => { saveSel(); track(); }}
        onBlur={saveSel}
        onPaste={onPaste}
        style={{ minHeight: 360, padding: "16px 16px 40px", background: "#fffdf8", color: "#1b1b1b",
          border: `1px solid ${BORDER}`, borderRadius: "0 0 10px 10px", outline: "none" }}
      />

      {modal === "link" && <LinkModal api={api} onClose={() => setModal(null)}
        onDone={(href, text) => {
          setModal(null);
          const internal = href.startsWith("/") || href.includes("selectionlab.in");
          const sel = saved.current && !saved.current.collapsed;
          if (sel) {
            cmd("createLink", href);
            if (!internal) ref.current?.querySelectorAll(`a[href="${CSS.escape(href)}"]`).forEach((a) => a.setAttribute("target", "_blank"));
            sync();
          } else {
            insert(`<a href="${esc(href)}"${internal ? "" : ' target="_blank"'}>${esc(text || href)}</a>&nbsp;`);
          }
        }} />}
      {modal === "button" && <ButtonModal api={api} onClose={() => setModal(null)}
        onDone={(text, href, bg) => { setModal(null); insert(buttonHtml(text, href, bg) + "<p><br></p>"); }} />}
      {modal === "table" && <TableModal onClose={() => setModal(null)}
        onDone={(r, c, h, bg) => { setModal(null); insert(tableHtml(r, c, h, bg)); }} />}
      {modal === "image" && <ImageModal onClose={() => setModal(null)}
        onDone={(src, alt) => { setModal(null); insert(`<p style="text-align: center"><img src="${esc(src)}" alt="${esc(alt)}"></p>`); }} />}
      {modal === "youtube" && <YoutubeModal onClose={() => setModal(null)}
        onDone={(src) => { setModal(null); insert(`<p><iframe src="${esc(src)}" allowfullscreen></iframe></p><p><br></p>`); }} />}
    </div>
  );
}

function Swatches({ colors, onPick }: { colors: string[]; onPick: (c: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, background: "#231d10", border: `1px solid ${BORDER}`, borderBottom: "none" }}>
      {colors.map((c) => (
        <button key={c} type="button" title={c === "transparent" ? "Rang hatao" : c}
          onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(c)}
          style={{ width: 30, height: 30, borderRadius: 6, cursor: "pointer", border: "2px solid rgba(255,255,255,0.3)",
            background: c === "transparent" ? "repeating-linear-gradient(45deg,#fff,#fff 4px,#f66 4px,#f66 6px)" : c }} />
      ))}
      <label title="Apna rang" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: MUTED }}>
        <input type="color" onChange={(e) => onPick(e.target.value)} style={{ width: 34, height: 30, border: "none", background: "none" }} />
        aur
      </label>
    </div>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex",
        alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "16px 16px 0 0", width: "100%",
        maxWidth: 560, maxHeight: "88vh", overflowY: "auto", padding: 16, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 15 }}>{title}</div>
          <button onClick={onClose} style={{ ...ghost, border: "none", fontSize: 18 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Apni website ke pages (course, mock, typing…) ki list + bahar ka link. */
function LinkPicker({ api, value, onChange }: { api: Api; value: string; onChange: (href: string, label?: string) => void }) {
  const [targets, setTargets] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    api("/admin-extra/blog/link-targets").then((d) => setTargets(d.targets || [])).catch(() => setTargets([]));
  }, [api]);
  const list = (targets || []).filter((t) => !q.trim() || `${t.group} ${t.label}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <span style={label}>Link — bahar ka (jaise notification PDF) yahan paste kariye</span>
      <input style={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… ya /course/12" />
      <span style={label}>…ya apni website se chuniye</span>
      <input style={{ ...input, marginBottom: 6 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dhoondhiye — course, mock, typing…" />
      <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}>
        {targets === null ? <div style={{ padding: 10, fontSize: 12.5, color: MUTED }}>Load ho raha hai…</div>
          : list.length === 0 ? <div style={{ padding: 10, fontSize: 12.5, color: MUTED }}>Kuch nahi mila</div>
          : list.slice(0, 80).map((t, i) => (
            <button key={i} type="button" onClick={() => onChange(t.path, t.label)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", fontSize: 13,
                background: value === t.path ? "rgba(255,171,0,0.14)" : "transparent", color: "#eee",
                border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
              <span style={{ color: MUTED, fontSize: 11, marginRight: 6 }}>{t.group}</span>{t.label}
            </button>
          ))}
      </div>
    </div>
  );
}

function LinkModal({ api, onClose, onDone }: { api: Api; onClose: () => void; onDone: (href: string, text: string) => void }) {
  const [href, setHref] = useState("");
  const [text, setText] = useState("");
  return (
    <Modal title="🔗 Link" onClose={onClose}>
      <div style={{ fontSize: 12, color: MUTED }}>Text select karke link dabaya tha to wahi text link banega.</div>
      <span style={label}>Dikhne wala text (select nahi kiya tha to)</span>
      <input style={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Jaise: Official notification" />
      <LinkPicker api={api} value={href} onChange={(h, l) => { setHref(h); if (l && !text) setText(l); }} />
      <button disabled={!href.trim()} onClick={() => onDone(href.trim(), text.trim())} style={{ ...gold, width: "100%", marginTop: 14, opacity: href.trim() ? 1 : 0.5 }}>Link lagao</button>
    </Modal>
  );
}

function ButtonModal({ api, onClose, onDone }: { api: Api; onClose: () => void; onDone: (text: string, href: string, bg: string) => void }) {
  const [text, setText] = useState("");
  const [href, setHref] = useState("");
  const [bg, setBg] = useState(GOLD);
  const ok = text.trim() && href.trim();
  return (
    <Modal title="🔘 Button" onClose={onClose}>
      <span style={label}>Button par kya likha ho</span>
      <input style={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Download Notification / Start Free Mock" />
      <span style={label}>Rang</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {BTN_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => setBg(c)} style={{ width: 34, height: 34, borderRadius: 8, background: c,
            border: bg === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)", cursor: "pointer" }} />
        ))}
        <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} style={{ width: 40, height: 34, border: "none", background: "none" }} />
      </div>
      <div style={{ textAlign: "center", margin: "14px 0 4px" }}>
        <span style={{ display: "inline-block", background: bg, color: textOn(bg), borderRadius: 10, padding: "12px 24px", fontWeight: 800, fontSize: 14.5 }}>
          {text || "Button"}
        </span>
      </div>
      <LinkPicker api={api} value={href} onChange={(h, l) => { setHref(h); if (l && !text) setText(l); }} />
      <button disabled={!ok} onClick={() => onDone(text.trim(), href.trim(), bg)} style={{ ...gold, width: "100%", marginTop: 14, opacity: ok ? 1 : 0.5 }}>Button jodo</button>
    </Modal>
  );
}

function TableModal({ onClose, onDone }: { onClose: () => void; onDone: (r: number, c: number, h: boolean, bg: string) => void }) {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(2);
  const [head, setHead] = useState(true);
  const [bg, setBg] = useState(GOLD);
  const num = (v: number, set: (n: number) => void, max: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" style={ghost} onClick={() => set(Math.max(1, v - 1))}>−</button>
      <b style={{ minWidth: 24, textAlign: "center" }}>{v}</b>
      <button type="button" style={ghost} onClick={() => set(Math.min(max, v + 1))}>+</button>
    </div>
  );
  return (
    <Modal title="▦ Table" onClose={onClose}>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>
        Baad me bhi row/column jod-hata sakte hain — table me click karte hi upar table ke button aa jayenge.
        Excel / Google Sheets se copy karke seedha paste bhi kar sakte hain.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><span style={label}>Rows</span>{num(rows, setRows, 40)}</div>
        <div><span style={label}>Columns</span>{num(cols, setCols, 8)}</div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 6px", fontSize: 13.5 }}>
        <input type="checkbox" checked={head} onChange={(e) => setHead(e.target.checked)} />
        Pehli row heading (jaise: Event | Date)
      </label>
      {head && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {BTN_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setBg(c)} style={{ width: 30, height: 30, borderRadius: 6, background: c,
              border: bg === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)", cursor: "pointer" }} />
          ))}
        </div>
      )}
      <button onClick={() => onDone(rows, cols, head, bg)} style={{ ...gold, width: "100%", marginTop: 14 }}>Table jodo</button>
    </Modal>
  );
}

function ImageModal({ onClose, onDone }: { onClose: () => void; onDone: (src: string, alt: string) => void }) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function upload(f?: File) {
    if (!f) return;
    setBusy(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await fetch(`${API_URL}/uploads/image`, {
        method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("sl_admin_token") || ""}` }, body: fd,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.detail || `Upload nahi hua (HTTP ${r.status})`);
      setSrc(d.url);
    } catch (e: any) { setErr(e?.message || "Upload nahi hua"); }
    setBusy(false);
  }
  return (
    <Modal title="🖼 Image" onClose={onClose}>
      <label style={{ ...gold, display: "block", textAlign: "center", background: "transparent", color: GOLD, border: `1px solid ${GOLD}` }}>
        {busy ? "Upload ho rahi hai…" : "📱 Phone / computer se chuniye"}
        <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      {err && <div style={{ color: "#ff6b6b", fontSize: 12.5, marginTop: 6 }}>{err}</div>}
      <span style={label}>…ya image ka link</span>
      <input style={input} value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://i.ibb.co/…" />
      {src && <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, marginTop: 8 }} />}
      <span style={label}>Image me kya hai (alt text — Google Images ke liye)</span>
      <input style={input} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Jaise: SKAU clerk exam pattern table" />
      <button disabled={!src.trim()} onClick={() => onDone(src.trim(), alt.trim())} style={{ ...gold, width: "100%", marginTop: 14, opacity: src.trim() ? 1 : 0.5 }}>Image jodo</button>
    </Modal>
  );
}

function YoutubeModal({ onClose, onDone }: { onClose: () => void; onDone: (src: string) => void }) {
  const [url, setUrl] = useState("");
  const src = youtubeEmbed(url);
  return (
    <Modal title="▶ YouTube video" onClose={onClose}>
      <span style={label}>Video ka link</span>
      <input style={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/…" />
      {url && !src && <div style={{ color: "#ff6b6b", fontSize: 12.5, marginTop: 6 }}>Ye YouTube ka link nahi lag raha</div>}
      <button disabled={!src} onClick={() => src && onDone(src)} style={{ ...gold, width: "100%", marginTop: 14, opacity: src ? 1 : 0.5 }}>Video jodo</button>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  SEO box
// ═══════════════════════════════════════════════════════════════════════════
function SeoPanel(p: {
  title: string; metaTitle: string; setMetaTitle: (v: string) => void; metaDesc: string; setMetaDesc: (v: string) => void;
  keyword: string; setKeyword: (v: string) => void; slug: string; setSlug: (v: string) => void;
  cover: string; setCover: (v: string) => void; coverAlt: string; setCoverAlt: (v: string) => void;
  faqs: Faq[]; setFaqs: (f: Faq[]) => void; seo: ReturnType<typeof seoCheck>;
}) {
  const gTitle = (p.metaTitle || p.title || "Post ka title").trim();
  const gDesc = (p.metaDesc || "Yahan 1-2 line ka description likhiye — Google isko title ke neeche dikhata hai.").trim();
  const count = (n: number, lo: number, hi: number) => (
    <span style={{ float: "right", color: n === 0 ? MUTED : n >= lo && n <= hi ? "#5dd97c" : "#ff6b6b" }}>{n} / {hi}</span>
  );
  return (
    <div>
      {/* Google preview */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", fontFamily: "arial, sans-serif", marginBottom: 6 }}>
        <div style={{ fontSize: 11.5, color: "#5f6368", marginBottom: 2 }}>Google me aisa dikhega</div>
        <div style={{ fontSize: 12.5, color: "#202124" }}>selectionlab.in › blog › {p.slug || "…"}</div>
        <div style={{ fontSize: 18, color: "#1a0dab", lineHeight: 1.3, margin: "3px 0" }}>
          {gTitle.length > 62 ? gTitle.slice(0, 60) + " …" : gTitle}
        </div>
        <div style={{ fontSize: 13, color: "#4d5156", lineHeight: 1.5 }}>
          {gDesc.length > 160 ? gDesc.slice(0, 157) + " …" : gDesc}
        </div>
      </div>

      <span style={label}>Focus keyword — log Google me kya likh kar dhoondhenge</span>
      <input style={input} value={p.keyword} onChange={(e) => p.setKeyword(e.target.value)} placeholder="Jaise: SKAU clerk syllabus" />

      <span style={label}>Google title {count((p.metaTitle || p.title).length, 30, 65)}</span>
      <input style={input} value={p.metaTitle} onChange={(e) => p.setMetaTitle(e.target.value)} placeholder={p.title || "Khaali = post ka title"} />

      <span style={label}>Description (Google + WhatsApp preview) {count(p.metaDesc.length, 70, 160)}</span>
      <textarea style={{ ...input, minHeight: 80, fontFamily: "inherit" }} value={p.metaDesc}
        onChange={(e) => p.setMetaDesc(e.target.value)} placeholder="Is post me kya milega — 1-2 line, keyword ke saath" />

      <span style={label}>URL (slug)</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12.5, color: MUTED }}>/blog/</span>
        <input style={input} value={p.slug} onChange={(e) => p.setSlug(e.target.value)} placeholder="skau-clerk-syllabus" />
      </div>

      <div style={{ marginTop: 12 }}>
        <ImageField label="Cover image (1200 × 630)" value={p.cover} onChange={p.setCover} reqW={1200} reqH={630}
          where="Blog ke upar, aur WhatsApp / Google share preview me" />
      </div>
      {p.cover && (
        <>
          <span style={label}>Cover image ka alt text</span>
          <input style={input} value={p.coverAlt} onChange={(e) => p.setCoverAlt(e.target.value)} placeholder="Image me kya hai" />
        </>
      )}

      {/* FAQ */}
      <div style={{ marginTop: 16, fontWeight: 800, fontSize: 14 }}>FAQ (sawaal-jawab)</div>
      <div style={{ fontSize: 12, color: MUTED, margin: "2px 0 8px" }}>
        Post ke neeche dikhega, aur Google isse search me sawaal-jawab ke roop me dikha sakta hai.
      </div>
      {p.faqs.map((f, i) => (
        <div key={i} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
          <input style={{ ...input, marginBottom: 6 }} value={f.q} placeholder={`Sawaal ${i + 1} — jaise: SKAU clerk ki typing speed kitni hai?`}
            onChange={(e) => p.setFaqs(p.faqs.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} />
          <textarea style={{ ...input, minHeight: 60, fontFamily: "inherit" }} value={f.a} placeholder="Jawab"
            onChange={(e) => p.setFaqs(p.faqs.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
          <button type="button" style={{ ...ghost, marginTop: 6, color: "#ff6b6b" }}
            onClick={() => p.setFaqs(p.faqs.filter((_, j) => j !== i))}>Hatao</button>
        </div>
      ))}
      <button type="button" style={ghost} onClick={() => p.setFaqs([...p.faqs, { q: "", a: "" }])}>+ Sawaal jodo</button>

      {/* Score */}
      <div style={{ marginTop: 18, fontWeight: 800, fontSize: 14 }}>SEO jaanch — {p.seo.score}/100</div>
      <div style={{ marginTop: 6 }}>
        {p.seo.checks.map((c, i) => (
          <div key={i} style={{ fontSize: 12.5, padding: "5px 0", color: c.ok ? "#b9e6c4" : "#f3c1b8",
            borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {c.ok ? "✓" : "✗"} {c.text}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
        Apne aap: Google ke liye Article + FAQ schema, share preview (OG image), &quot;Last updated&quot; date aur sitemap.
        Nayi post ke baad Google Search Console me URL daal ke &quot;Request indexing&quot; dabaiye — jaldi aati hai.
      </div>
    </div>
  );
}
