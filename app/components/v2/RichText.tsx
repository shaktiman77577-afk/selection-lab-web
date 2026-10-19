// Course description ko saaf dikhane wala chhota markdown renderer (Oct 2026).
//
// Kyun: admin description me **bold**, ### heading, - list likhta hai, par page
// use seedha text ki tarah dikhata tha — student ko "**" aur "###" dikhte the.
// Ab ye format ban kar dikhte hain. Saada text (bina markdown, jaise bundle ka)
// pehle jaisa hi dikhta hai — har line apni jagah.
//
// Kya samajhta hai: # / ## / ### heading, - * • list, 1. list, --- line,
// **bold**, __bold__, *italic*, aur http(s) link.
// HTML kabhi nahi chalata (dangerouslySetInnerHTML nahi) — sab React se banta hai.

import { Fragment, ReactNode } from "react";

type Block =
  | { k: "h"; text: string }
  | { k: "ul"; items: string[] }
  | { k: "ol"; items: string[] }
  | { k: "p"; lines: string[] }
  | { k: "hr" };

const RE_H = /^#{1,6}\s+(.*)$/;
const RE_UL = /^[-*•]\s+(.*)$/;
const RE_OL = /^\d{1,3}[.)]\s+(.*)$/;
const RE_HR = /^(?:-{3,}|\*{3,}|_{3,})$/;

function parse(src: string): Block[] {
  const out: Block[] = [];
  let cur: Block | null = null;
  const close = () => {
    if (cur) out.push(cur);
    cur = null;
  };

  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    if (RE_HR.test(line)) {
      close();
      out.push({ k: "hr" });
      continue;
    }
    let m = line.match(RE_H);
    if (m) {
      close();
      out.push({ k: "h", text: m[1].replace(/\s+#+$/, "") });
      continue;
    }
    m = line.match(RE_UL);
    if (m) {
      if (!cur || cur.k !== "ul") {
        close();
        cur = { k: "ul", items: [] };
      }
      cur.items.push(m[1]);
      continue;
    }
    m = line.match(RE_OL);
    if (m) {
      if (!cur || cur.k !== "ol") {
        close();
        cur = { k: "ol", items: [] };
      }
      cur.items.push(m[1]);
      continue;
    }
    if (!cur || cur.k !== "p") {
      close();
      cur = { k: "p", lines: [] };
    }
    cur.lines.push(line);
  }
  close();
  return out;
}

// **bold**, __bold__, *italic*, links
const RE_INLINE = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|\*[^*\s][^*\n]*?\*|https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/g;

function inline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(RE_INLINE);
  return parts.map((p, i) => {
    const key = `${keyBase}-${i}`;
    if (!p) return null;
    if ((p.startsWith("**") && p.endsWith("**") && p.length > 4) || (p.startsWith("__") && p.endsWith("__") && p.length > 4)) {
      return <strong key={key}>{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
      return <em key={key}>{p.slice(1, -1)}</em>;
    }
    if (/^https?:\/\//.test(p)) {
      return (
        <a key={key} href={p} target="_blank" rel="noopener noreferrer nofollow">
          {p}
        </a>
      );
    }
    return <Fragment key={key}>{p}</Fragment>;
  });
}

export default function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parse(text || "");
  return (
    <div className={`v2-rich ${className}`.trim()}>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        if (b.k === "h") return <h3 key={k}>{inline(b.text, k)}</h3>;
        if (b.k === "hr") return <hr key={k} />;
        if (b.k === "ul")
          return (
            <ul key={k}>
              {b.items.map((it, j) => (
                <li key={j}>{inline(it, `${k}-${j}`)}</li>
              ))}
            </ul>
          );
        if (b.k === "ol")
          return (
            <ol key={k}>
              {b.items.map((it, j) => (
                <li key={j}>{inline(it, `${k}-${j}`)}</li>
              ))}
            </ol>
          );
        return (
          <p key={k}>
            {b.lines.map((ln, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(ln, `${k}-${j}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
