// Server par (page bante waqt) data lana - website redesign (Oct 2026).
//
// Pehle home aur list pages browser me khulne ke BAAD data mangte the, isliye
// pehle "Loading..." dikhta tha aur Google ko bhi khaali page milta tha. Ab
// page server par hi data ke saath banta hai, aur 60 second tak cache rehta hai
// (admin ka badlav max 1 minute me dikh jata hai).
//
// Yahan user ka koi data nahi (login, kharida hua) - wo browser me alag se aata hai.
import { API_URL } from "./config";

async function get(path: string, revalidate = 60): Promise<any> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
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
  return list(await get("/courses/?platform=web"), "courses");
}

export async function getBannersServer(): Promise<any[]> {
  return list(await get("/banners/"), "banners");
}

export async function getMockSeriesServer(): Promise<any[]> {
  return list(await get("/mock-tests/series?platform=web"), "series");
}

export async function getDescriptiveSeriesServer(): Promise<any[]> {
  return list(await get("/descriptive/series?platform=web"), "series");
}

// Mock / Typing / Descriptive series jinpe admin ne "Featured" tick lagaya (home carousel)
export async function getFeaturedSeriesServer(): Promise<any[]> {
  return list(await get("/banners/featured-series?platform=web"), "series");
}

export async function getTier2SeriesServer(): Promise<any[]> {
  return list(await get("/tier2/series?platform=web"), "series");
}
