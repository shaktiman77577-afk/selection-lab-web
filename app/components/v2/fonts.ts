// Website redesign ke font - sirf naye (v2) pages par load hote hain.
// English: Plus Jakarta Sans, Hindi: Noto Sans Devanagari.
import { Plus_Jakarta_Sans, Noto_Sans_Devanagari } from "next/font/google";

export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-deva",
  display: "swap",
  preload: false,
});
