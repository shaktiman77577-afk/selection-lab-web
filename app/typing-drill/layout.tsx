import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Free Typing Practice — 10 Finger Drill",
  description: "Free step-by-step touch typing drill for government exam typing tests. Learn all 10 fingers, build speed and accuracy in English.",
  path: "/typing-drill",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
