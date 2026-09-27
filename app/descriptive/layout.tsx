import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Descriptive Test Series — Essay, Letter, Precis",
  description: "Descriptive writing practice for government exams — essay, letter and precis with instant evaluation, model answers and word-count checks.",
  path: "/descriptive",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
