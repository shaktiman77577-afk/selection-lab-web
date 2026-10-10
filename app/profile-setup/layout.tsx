// Google me nahi aana chahiye — test dene / result / login jaisa niji page
//
// Website redesign (Oct 2026): login ke turant baad ka form hai - uska code
// nahi chhua. Sirf V2Shell se naya font milta hai.
import { privateMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";

export const metadata = privateMeta("Profile");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
