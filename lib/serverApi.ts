// Server par (page bante waqt) data lana - website redesign (Oct 2026).
//
// Pehle home aur list pages browser me khulne ke BAAD data mangte the, isliye
// pehle "Loading..." dikhta tha aur Google ko bhi khaali page milta tha. Ab
// page server par hi data ke saath banta hai aur cache me rehta hai.
//
// Yahan user ka koi data nahi (login, kharida hua) - wo browser me alag se aata hai.
//
// Cache (Oct 2026): 60 second wala cache Vercel ki ISR Writes limit kha gaya.
// Ab har fetch par ek tag hai — admin ke badlav par backend sirf usi tag ko
// refresh karwata hai, backup 6 ghante. Dekho lib/cacheTags.ts
import { API_URL } from "./config";
import { TAG, LIST_TTL } from "./cacheTags";

async function get(path: string, tags: string[], revalidate = LIST_TTL): Promise<any> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate, tags } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function list(d: any, key: string): any[] {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d[key])) return d[key];
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

export async function getCoursesServer(): Promise<any[]> {
  return list(await get("/courses/?platform=web", [TAG.courses]), "courses");
}

export async function getBannersServer(): Promise<any[]> {
  return list(await get("/banners/", [TAG.banners]), "banners");
}

export async function getMockSeriesServer(): Promise<any[]> {
  return list(await get("/mock-tests/series?platform=web", [TAG.mocks]), "series");
}

export async function getDescriptiveSeriesServer(): Promise<any[]> {
  return list(await get("/descriptive/series?platform=web", [TAG.descriptive]), "series");
}

// Mock / Typing / Descriptive series jinpe admin ne "Featured" tick lagaya (home carousel)
export async function getFeaturedSeriesServer(): Promise<any[]> {
  return list(await get("/banners/featured-series?platform=web", [
    TAG.featured, TAG.banners, TAG.mocks, TAG.descriptive, TAG.tier2, TAG.courses,
  ]), "series");
}

export async function getTier2SeriesServer(): Promise<any[]> {
  return list(await get("/tier2/series?platform=web", [TAG.tier2]), "series");
}
