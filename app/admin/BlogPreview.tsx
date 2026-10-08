"use client";

/**
 * BlogPreview.tsx — draft (unpublished) post ko admin me hi dekhna.
 *
 * Website ka /blog/[slug] sirf published post dikhata hai (Google ke liye
 * sahi) — isliye draft par "View" 404 deta tha. Ye wahi BLOG_CSS laga kar
 * post ko lagbhag waise hi dikhata hai jaise publish ke baad dikhegi.
 */

import { useEffect, useState } from "react";
import { BLOG_CSS, mdToHtml } from "@/lib/blogHtml";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

export default function BlogPreview({ api, postId, onClose, onEdit }: {
  api: ApiFn; postId: number; onClose: () => void; onEdit: () => void;
}) {
  const [post, setPost] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api(`/admin-extra/blog/${postId}`).then((d) => setPost(d.post)).catch((e) => setErr(e.message));
  }, [api, postId]);

  const html = post ? (post.content_format === "html" ? post.content : mdToHtml(post.content || "")) : "";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", overflowY: "auto", padding: "16px 12px 40px" }}>
      <style dangerouslySetInnerHTML={{ __html: BLOG_CSS }} />
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 10, position: "sticky", top: 0 }}>
          <button onClick={onEdit} style={{ background: "#FFAB00", color: "#1a1a1a", border: "none", borderRadius: 9, padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}>Edit / Publish</button>
          <button onClick={onClose} style={{ background: "#16130e", color: "#fff", border: "1px solid rgba(255,171,0,0.35)", borderRadius: 9, padding: "9px 14px", fontWeight: 700, cursor: "pointer" }}>Band karo</button>
        </div>
        {err && <div style={{ color: "#ff6b6b", padding: 12 }}>{err}</div>}
        {!post && !err && <div style={{ color: "#aaa", padding: 12 }}>Loading...</div>}
        {post && (
          <div style={{ background: "#fffdf8", color: "#1b1b1b", borderRadius: 14, padding: "18px 16px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#b07a00", marginBottom: 6 }}>
              PREVIEW — {post.is_published ? "published" : "abhi draft hai, website par nahi dikhti"}
            </div>
            <h1 style={{ fontSize: 24, lineHeight: 1.3, margin: "0 0 10px" }}>{post.title}</h1>
            {post.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.cover_url} alt={post.cover_alt || ""} style={{ width: "100%", borderRadius: 12, marginBottom: 14 }} />
            )}
            <div className="sl-blog" dangerouslySetInnerHTML={{ __html: html }} />
            {Array.isArray(post.faqs) && post.faqs.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h2 style={{ fontSize: 20 }}>Frequently asked questions</h2>
                {post.faqs.map((f: any, i: number) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 700 }}>{f.q}</div>
                    <div style={{ lineHeight: 1.7 }}>{f.a}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 18, borderTop: "1px solid #eee", paddingTop: 12, fontSize: 12.5, color: "#555", lineHeight: 1.7 }}>
              <b>Google me:</b> {post.meta_title || post.title}<br />
              {post.meta_description || post.excerpt}<br />
              <b>Focus keyword:</b> {post.focus_keyword || "—"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
