import type { MetadataRoute } from "next";

const BASE = "https://www.selectionlab.online";
const API_URL = "https://api.selectionlab.online/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];

  let coursePages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/courses/`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const courses = Array.isArray(data) ? data : data.courses || [];
      coursePages = courses.map((c: any) => ({
        url: `${BASE}/course/${c.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // API unreachable at build time — static pages still ship
  }

  return [...staticPages, ...coursePages];
}
