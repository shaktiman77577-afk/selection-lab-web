import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Online Courses for SSC, IB, Railways & Court Exams",
  description: "Selection Lab courses for SSC CGL, IB, Railways, High Court clerk and university exams — video classes, notes, PYQs and mock tests in Hindi and English by Nikki Ma’am.",
  path: "/courses",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
