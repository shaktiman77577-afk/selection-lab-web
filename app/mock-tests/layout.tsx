import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Mock Test Series — Real Exam Interface",
  description: "Full-length mock tests with the real exam interface for SSC, IB, Railways, court clerk and university exams. Detailed solutions in Hindi and English, all-India rank.",
  path: "/mock-tests",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
