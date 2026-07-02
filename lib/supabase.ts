// Content fetch — uses the Railway API (same backend the app uses).
// Filename kept as supabase.ts so app/page.tsx imports keep working.

import { API_URL } from "./config";

export interface Course {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  thumbnail_url?: string;
  thumbnail?: string;
  image_url?: string;
  price?: number;
  original_price?: number;
  course_type?: string;
  is_featured?: boolean;
  is_active?: boolean;
  is_free?: boolean;
  features?: string;
  [key: string]: any;
}

export interface Banner {
  id: number;
  image_url?: string;
  image?: string;
  banner_url?: string;
  link?: string;
  title?: string;
  [key: string]: any;
}

async function apiGet(path: string): Promise<any> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getCourses(): Promise<Course[]> {
  const data = await apiGet("/courses/");
  if (Array.isArray(data)) return data;
  if (data?.courses) return data.courses;
  return [];
}

export async function getBanners(): Promise<Banner[]> {
  const data = await apiGet("/banners/");
  if (Array.isArray(data)) return data;
  if (data?.banners) return data.banners;
  return [];
}

// Helpers to read fields regardless of exact column names
export function courseTitle(c: Course): string {
  return c.title || c.name || "Course";
}
export function courseImage(c: Course): string {
  return c.thumbnail_url || c.thumbnail || c.image_url || "";
}
export function bannerImage(b: Banner): string {
  return b.image_url || b.banner_url || b.image || "";
}
