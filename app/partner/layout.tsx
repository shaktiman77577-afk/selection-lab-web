import { pageMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";

export const metadata = pageMeta({
  title: "Partner Program — Earn with Selection Lab",
  description: "Join the Selection Lab partner program: share courses and mock tests with your students and earn commission on every sale.",
  path: "/partner",
});

// Website redesign (Oct 2026): partner portal ka apna header aur dashboard hai
// (earnings, withdrawal) - uska code nahi chhua. Sirf naya font milta hai.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
