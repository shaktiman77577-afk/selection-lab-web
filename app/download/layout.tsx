// /download — "Download our app" (Windows + Android closed testing). Oct 2026
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Download the App",
  description: "Get the Selection Lab app for Windows, and join our Android app on Google Play.",
  path: "/download",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
