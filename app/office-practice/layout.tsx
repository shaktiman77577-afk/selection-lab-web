import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "MS Office Practice — Excel, Word, PowerPoint",
  description: "Practise Excel formulas, Word formatting and PowerPoint tasks exactly as asked in computer proficiency (CPT) and skill tests.",
  path: "/office-practice",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
