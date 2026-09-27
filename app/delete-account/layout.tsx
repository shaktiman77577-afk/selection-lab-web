// Google me nahi aana chahiye — test dene / result / login jaisa niji page
import { privateMeta } from "@/lib/seo";

export const metadata = privateMeta("Delete Account");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
