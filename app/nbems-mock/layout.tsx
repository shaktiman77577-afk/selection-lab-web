import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "NBEMS Junior Assistant Full Mocks",
  description: "75-minute NBEMS Junior Assistant full mocks: typing, Excel, Word, PowerPoint and MCQs on one clock with a combined scorecard.",
  path: "/nbems-mock",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
