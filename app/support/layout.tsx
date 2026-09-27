import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Help & Support",
  description: "Get help with courses, payments, login and mock tests on Selection Lab. Chat with our support team.",
  path: "/support",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
