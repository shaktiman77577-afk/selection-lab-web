// Website redesign ke font - sirf naye (v2) pages par load hote hain.
// English: Plus Jakarta Sans, Hindi: Noto Sans Devanagari.
//
// Pehle ye next/font/google se aate the, par Vercel par Turbopack build
// Noto Sans Devanagari ki font files resolve nahi kar paya aur build fail ho
// gaya. Isliye ab seedha Google Fonts ki stylesheet se aate hain (build ke
// waqt kuch download nahi hota). Font aane tak system font dikhta hai (swap).
export const V2_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap";
