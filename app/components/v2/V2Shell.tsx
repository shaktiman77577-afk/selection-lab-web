// Naye design (v2) wale pages is wrapper ke andar aate hain.
// Isi se naya font aur v2.css lagta hai - purane pages par kuch nahi badalta.
import "../../v2.css";
import { jakarta, deva } from "./fonts";

export default function V2Shell({ children }: { children: React.ReactNode }) {
  return <div className={`v2 ${jakarta.variable} ${deva.variable}`}>{children}</div>;
}
