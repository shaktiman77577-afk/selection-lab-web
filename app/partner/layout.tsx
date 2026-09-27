import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Partner Program — Earn with Selection Lab",
  description: "Join the Selection Lab partner program: share courses and mock tests with your students and earn commission on every sale.",
  path: "/partner",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
