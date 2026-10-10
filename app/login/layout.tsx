// Google me nahi aana chahiye — test dene / result / login jaisa niji page
//
// Website redesign (Oct 2026): login page ka code nahi chhua (Google, OTP,
// reCAPTCHA nazuk hain). Sirf V2Shell se naya font aur design layer milti hai.
import { privateMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";

export const metadata = privateMeta("Login");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
