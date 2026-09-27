import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Excel / CPT Practice for Skill Tests",
  description: "Excel formula chart, CPT mock tasks and bonus MCQs for computer proficiency and skill tests in government exams.",
  path: "/tier2/excel",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
