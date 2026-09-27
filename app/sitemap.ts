import type { MetadataRoute } from "next";
import { API, SITE } from "@/lib/seo";

// Google ko website ke saare public pages ki list.
// Pehle yahan "selectionlab.in" (bina www) tha, jabki site www par chalti hai —
// Google ko har URL redirect milta tha. Sirf courses the; mock, typing aur
// descriptive series sitemap me thi hi nahi.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "daily", priority: 1, lastModified: now },
    { url: `${SITE}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/mock-tests`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/tier2`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/descriptive`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/score-checker`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/nbems-mock`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/typing-drill`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/office-practice`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/tier2/excel`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/partner`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/support`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Course aur har tarah ki series — sirf jo website par dikhti hain (backend chhaant deta hai)
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API}/share/all-items`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const path: Record<string, (id: number) => string> = {
        course: (id) => `/course/${id}`,
        mock: (id) => `/mock-tests/${id}`,
        tier2: (id) => `/tier2?s=${id}`,
        descriptive: (id) => `/descriptive/${id}`,
      };
      productPages = (data.items || [])
        .filter((x: any) => path[x.kind])
        .map((x: any) => ({
          url: SITE + path[x.kind](x.id),
          changeFrequency: "weekly" as const,
          priority: x.kind === "course" ? 0.8 : 0.7,
          ...(x.updated_at ? { lastModified: new Date(x.updated_at) } : {}),
        }));
    }
  } catch {
    // API na mile to bhi baaki sitemap chale
  }

  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API}/blog/`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      blogPages = (data.posts || []).map((p: any) => ({
        url: `${SITE}/blog/${p.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        ...(p.created_at ? { lastModified: new Date(p.created_at) } : {}),
      }));
    }
  } catch {}

  return [...staticPages, ...productPages, ...blogPages];
}
