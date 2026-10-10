// Naye design (v2) wale pages is wrapper ke andar aate hain.
// Isi se naya font aur v2 CSS lagta hai - purane pages par kuch nahi badalta.
import { preconnect } from "react-dom";
import "../../v2.css";
import "../../v2-detail.css";
import { V2_FONTS_URL } from "./fonts";

export default function V2Shell({ children }: { children: React.ReactNode }) {
  // Google Fonts se jaldi connection (React ise <head> me daal deta hai)
  preconnect("https://fonts.googleapis.com");
  preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });
  return (
    <div className="v2">
      {/* React 19: precedence wala stylesheet <head> me jata hai, ek hi baar */}
      <link rel="stylesheet" href={V2_FONTS_URL} precedence="default" />
      {children}
    </div>
  );
}
