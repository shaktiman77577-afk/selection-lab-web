// Google me nahi aana chahiye — login jaisa niji page
import { privateMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";

export const metadata = privateMeta("Reset password");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
