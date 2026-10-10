// Sirf Windows desktop app ka Google login page — Google me nahi aana chahiye
import { privateMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";

export const metadata = privateMeta("Desktop app sign-in");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
