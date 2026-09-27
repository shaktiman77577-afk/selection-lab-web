/**
 * lib/blogHtml.ts — blog ke naye editor aur website page dono ki saanjhi cheezein.
 *
 *   mdToHtml()   purani post (## heading, [text](link) waala likhawat) ko HTML
 *                me — taaki purani post naye editor me khul sake
 *   BLOG_CSS     editor aur website par ek jaisa dikhne ke liye
 *   seoCheck()   SEO box ka score aur sujhaav
 *   cleanPasted() Word / Google Docs / Excel se paste kiye HTML ki safai
 *
 * Asli safai (script, onclick waghera hatana) backend karta hai
 * (core/html_clean.py) — yahan wali sirf editor ko saaf rakhne ke liye hai.
 */

export const GOLD = "#FFAB00";

export function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineMd(t: string): string {
  let out = "";
  let last = 0;
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    out += esc(t.slice(last, m.index));
    const internal = m[2].startsWith("/") || m[2].includes("selectionlab.in");
    out += `<a href="${esc(m[2])}"${internal ? "" : ' target="_blank"'}>${esc(m[1])}</a>`;
    last = m.index + m[0].length;
  }
  return out + esc(t.slice(last));
}

/** Purana likhawat → HTML. Website ka purana renderer jaisa hi (app/blog/[slug]). */
export function mdToHtml(content: string): string {
  return String(content || "").split(/\n\s*\n/).map((b) => {
    const t = b.trim();
    if (!t) return "";
    if (t.startsWith("## ")) return `<h2>${inlineMd(t.slice(3))}</h2>`;
    const only = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (only) return buttonHtml(only[1], only[2], GOLD);
    const lines = t.split("\n");
    if (lines.every((l) => l.trim().startsWith("- "))) {
      return `<ul>${lines.map((l) => `<li>${inlineMd(l.trim().slice(2))}</li>`).join("")}</ul>`;
    }
    return `<p>${lines.map(inlineMd).join("<br>")}</p>`;
  }).join("");
}

/** Text ka rang background ke hisaab se — kaale button par safed, peele par kaala. */
export function textOn(bg: string): string {
  const h = bg.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(h)) return "#1a1a1a";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1a1a1a" : "#ffffff";
}

export function buttonHtml(text: string, href: string, bg: string): string {
  const internal = href.startsWith("/") || href.includes("selectionlab.in");
  return `<p style="text-align: center"><a data-btn="1" href="${esc(href)}"${internal ? "" : ' target="_blank"'} ` +
    `style="background-color: ${bg}; color: ${textOn(bg)}">${esc(text)}</a></p>`;
}

export function tableHtml(rows: number, cols: number, header: boolean, headBg = GOLD): string {
  const cell = (tag: "th" | "td", r: number, c: number) =>
    tag === "th" ? `<th style="background-color: ${headBg}; color: ${textOn(headBg)}">Heading ${c + 1}</th>` : `<td>&nbsp;</td>`;
  let h = "<table><tbody>";
  for (let r = 0; r < rows; r++) {
    const tag = header && r === 0 ? "th" : "td";
    h += "<tr>" + Array.from({ length: cols }, (_, c) => cell(tag, r, c)).join("") + "</tr>";
  }
  return h + "</tbody></table><p><br></p>";
}

export function youtubeEmbed(url: string): string | null {
  const u = url.trim();
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// Editor aur website dono par — ".sl-blog" ke andar
export const BLOG_CSS = `
.sl-blog { font-size: 15px; line-height: 1.8; word-wrap: break-word; }
.sl-blog p { margin: 0 0 14px; }
.sl-blog h2 { font-size: 20px; line-height: 1.35; margin: 26px 0 10px; }
.sl-blog h3 { font-size: 17px; line-height: 1.4; margin: 20px 0 8px; }
.sl-blog h4 { font-size: 15.5px; margin: 16px 0 6px; }
.sl-blog ul, .sl-blog ol { margin: 0 0 14px; padding-left: 24px; }
.sl-blog li { margin-bottom: 6px; }
.sl-blog a { color: ${GOLD}; font-weight: 700; text-decoration: underline; }
.sl-blog a[data-btn] { display: inline-block; background: ${GOLD}; color: #1a1a1a; border-radius: 10px;
  padding: 12px 24px; font-weight: 800; font-size: 14.5px; text-decoration: none; margin: 4px 0; }
.sl-blog blockquote { margin: 0 0 14px; padding: 10px 14px; border-left: 4px solid ${GOLD};
  background: rgba(255,171,0,0.08); border-radius: 6px; }
.sl-blog hr { border: none; border-top: 1px solid rgba(128,128,128,0.35); margin: 22px 0; }
.sl-blog img { max-width: 100%; height: auto; border-radius: 10px; }
.sl-blog iframe { width: 100%; aspect-ratio: 16 / 9; height: auto; border: 0; border-radius: 10px; }
.sl-blog table { border-collapse: collapse; width: 100%; margin: 0 0 16px; font-size: 14px; color: inherit;
  display: block; overflow-x: auto; }
.sl-blog table tbody { display: table; width: 100%; border-collapse: collapse; }
.sl-blog th, .sl-blog td { border: 1px solid rgba(128,128,128,0.45); padding: 8px 10px; text-align: left;
  vertical-align: top; min-width: 70px; }
.sl-blog th { font-weight: 800; }
.sl-faq details { border: 1px solid rgba(128,128,128,0.35); border-radius: 10px; padding: 10px 14px; margin-bottom: 8px; }
.sl-faq summary { font-weight: 700; cursor: pointer; }
`;

// ── Paste ki safai ──────────────────────────────────────────────────────────
const KEEP_TAGS = new Set(["P", "BR", "H2", "H3", "H4", "STRONG", "B", "EM", "I", "U", "S", "SPAN", "A", "UL", "OL",
  "LI", "BLOCKQUOTE", "HR", "IMG", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "DIV", "SUP", "SUB"]);
const KEEP_CSS = ["color", "background-color", "text-align", "font-weight", "font-style", "text-decoration"];

/** Word/Docs/Excel ka paste — font, class, faltu style hata kar sirf saaf formatting. */
export function cleanPasted(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (el: Element) => {
    Array.from(el.children).forEach((c) => {
      const tag = c.tagName;
      if (["SCRIPT", "STYLE", "META", "LINK", "TITLE", "XML", "O:P"].includes(tag)) { c.remove(); return; }
      if (tag === "H1") {
        const h = doc.createElement("h2"); h.innerHTML = c.innerHTML; c.replaceWith(h); walk(h); return;
      }
      walk(c);
      if (!KEEP_TAGS.has(tag)) { c.replaceWith(...Array.from(c.childNodes)); return; }
      const st = (c as HTMLElement).style;
      const keep: string[] = [];
      KEEP_CSS.forEach((k) => {
        const v = st?.getPropertyValue(k);
        if (v && !/windowtext|transparent|initial|inherit/i.test(v)) keep.push(`${k}: ${v}`);
      });
      Array.from(c.attributes).forEach((a) => {
        const n = a.name.toLowerCase();
        const ok = (n === "href" && tag === "A") || (n === "src" && tag === "IMG") || (n === "alt" && tag === "IMG")
          || ((n === "colspan" || n === "rowspan") && (tag === "TD" || tag === "TH"));
        if (!ok) c.removeAttribute(a.name);
      });
      if (keep.length) c.setAttribute("style", keep.join("; "));
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

// ── SEO jaanch ──────────────────────────────────────────────────────────────
export type SeoInput = {
  title: string; metaTitle: string; metaDesc: string; slug: string; keyword: string;
  html: string; cover: string; coverAlt: string; faqs: { q: string; a: string }[];
};
export type SeoCheck = { ok: boolean; text: string; weight: number };

export function htmlText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || "").replace(/\s+/g, " ").trim();
}

export function seoCheck(x: SeoInput): { score: number; checks: SeoCheck[]; words: number } {
  const text = htmlText(x.html);
  const words = text ? text.split(" ").length : 0;
  const kw = x.keyword.trim().toLowerCase();
  const t = (x.metaTitle || x.title).trim();
  // Pehla asli paragraph (khaali ya sirf button wala nahi) — ya shuru ke 200 akshar
  const paras = (x.html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || []).map(htmlText).filter((t) => t.split(" ").length >= 5);
  const firstPara = (paras[0] || text.slice(0, 200)).toLowerCase();
  const headings = (x.html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi) || []).map((h) => htmlText(h).toLowerCase());
  const links = (x.html.match(/<a\s[^>]*href="([^"]+)"/gi) || []).map((a) => (a.match(/href="([^"]+)"/i) || [])[1] || "");
  const internal = links.filter((l) => l.startsWith("/") || l.includes("selectionlab.in")).length;
  const imgs = x.html.match(/<img\b[^>]*>/gi) || [];
  const imgNoAlt = imgs.filter((i) => !/alt="[^"]+"/i.test(i)).length;
  const slugKw = kw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const checks: SeoCheck[] = [
    { weight: 10, ok: !!kw, text: kw ? `Focus keyword: "${x.keyword.trim()}"` : "Focus keyword daaliye — log Google me kya search karenge (jaise: SKAU clerk syllabus)" },
    { weight: 12, ok: t.length >= 30 && t.length <= 65, text: `Google title ${t.length} akshar — ${t.length < 30 ? "thoda lamba kariye (30-60)" : t.length > 65 ? "Google kaat dega, 60 ke aas-paas rakhiye" : "sahi lambai"}` },
    { weight: 10, ok: !!kw && t.toLowerCase().includes(kw), text: "Keyword Google title me hai" },
    { weight: 10, ok: x.metaDesc.trim().length >= 70 && x.metaDesc.trim().length <= 160, text: `Description ${x.metaDesc.trim().length} akshar — ${x.metaDesc.trim().length < 70 ? "1-2 line likhiye (70-155)" : x.metaDesc.trim().length > 160 ? "155 se chhoti kariye" : "sahi lambai"}` },
    { weight: 6, ok: !!kw && x.metaDesc.toLowerCase().includes(kw), text: "Keyword description me hai" },
    { weight: 6, ok: !!slugKw && x.slug.includes(slugKw), text: "Keyword URL (slug) me hai" },
    { weight: 8, ok: !!kw && firstPara.includes(kw), text: "Keyword pehle paragraph me hai" },
    { weight: 6, ok: headings.length >= 2, text: headings.length >= 2 ? `${headings.length} headings — padhne me aasaan` : "Kam se kam 2 heading (H2) lagaiye" },
    { weight: 6, ok: !!kw && headings.some((h) => h.includes(kw)), text: "Keyword kisi heading me hai" },
    { weight: 10, ok: words >= 300, text: `${words} shabd — ${words >= 600 ? "badhiya" : words >= 300 ? "theek hai, 600+ ho to aur achha" : "kam se kam 300 shabd likhiye"}` },
    { weight: 8, ok: internal >= 1, text: internal ? `${internal} link apni website par (course / mock)` : "Apne course ya mock test ka button/link jodiye" },
    { weight: 4, ok: !!x.cover, text: x.cover ? "Cover image hai" : "Cover image lagaiye (WhatsApp / Google me dikhti hai)" },
    { weight: 2, ok: !x.cover || !!x.coverAlt.trim(), text: "Cover image ka alt text" },
    { weight: 2, ok: imgNoAlt === 0, text: imgNoAlt ? `${imgNoAlt} image me alt text nahi` : "Saari images me alt text" },
  ];
  const faqOk = x.faqs.filter((f) => f.q.trim() && f.a.trim()).length;
  checks.push({ weight: 0, ok: faqOk > 0, text: faqOk ? `${faqOk} FAQ — Google me sawaal-jawab dikh sakte hain` : "FAQ jodiye (optional) — Google me extra jagah milti hai" });
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  return { score: Math.round((got / total) * 100), checks, words };
}
