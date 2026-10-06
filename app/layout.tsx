import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Tinos } from "next/font/google";
import ActivityBeacon from "@/app/components/ActivityBeacon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Typing tests ka font Times New Roman hai. Android/Linux par Times New Roman
// nahi hota, isliye Tinos (same size ka metric-compatible font) fallback hai.
const tinos = Tinos({
  variable: "--font-tinos",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.selectionlab.in"),
  title: {
    default: "Selection Lab — Government Exam Preparation | SSC, IB, Railways",
    template: "%s | Selection Lab",
  },
  description:
    "Prepare for SSC CGL, IB SA, Railways, UP SIB and other government exams with Selection Lab. Courses, mock tests, PYQs and daily quizzes in Hindi and English by Nikki Ma'am.",
  keywords: [
    "Selection Lab",
    "government exam preparation",
    "SSC CGL course",
    "IB SA interview",
    "SSC English course",
    "Nikki Ma'am English",
    "sarkari naukri preparation",
    "mock tests online",
    "PYQ government exams",
    "Railways exam course",
  ],
  authors: [{ name: "Selection Lab" }],
  // og:url yahan NAHI — warna har page (jiska apna metadata nahi) Google/WhatsApp
  // ko apna URL homepage batata tha. Har page apna url lib/seo.ts pageMeta se deta hai.
  openGraph: {
    type: "website",
    siteName: "Selection Lab",
    title: "Selection Lab — Government Exam Preparation",
    description:
      "Courses, mock tests, PYQs and daily quizzes for SSC, IB, Railways and more. Learn in Hindi and English with Nikki Ma'am.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Selection Lab — SSC, IB & Railway Exam Preparation",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Selection Lab — Government Exam Preparation",
    description:
      "Courses, mock tests, PYQs and daily quizzes for SSC, IB, Railways and more.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f4ee",
  width: "device-width",
  initialScale: 1,
};

const themeCss = `
:root{
  --bg:#f6f4ee; --card:#ffffff; --text:#221c10; --text2:#4c4536; --muted:#776f5c;
  --border:rgba(180,130,0,0.4); --line:rgba(0,0,0,0.1); --chip:rgba(0,0,0,0.05);
  --header:rgba(250,248,242,0.97); --shadow:0 1px 8px rgba(0,0,0,0.06);
}
html[data-theme="dark"]{
  --bg:#0d0b08; --card:#16130e; --text:#ffffff; --text2:#cfc6b3; --muted:#9a917f;
  --border:rgba(255,171,0,0.25); --line:rgba(255,255,255,0.1); --chip:rgba(255,255,255,0.07);
  --header:rgba(13,11,8,0.97); --shadow:none;
}
body{background:var(--bg);color:var(--text);}
`;

const ORG_LD = JSON.stringify([
  {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Selection Lab",
    url: "https://www.selectionlab.in",
    logo: "https://www.selectionlab.in/logo.png",
    description: "Government exam preparation — courses, mock tests, typing tests and PYQs in Hindi and English.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Selection Lab",
    url: "https://www.selectionlab.in",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.selectionlab.in/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
]);

const themeScript = `try{if(localStorage.getItem('sl-theme')==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}`;

// Security Phase 2: hamare API (api.selectionlab.online) ki har fetch me login
// token apne aap. Website me sau se zyada jagah seedha fetch() hai — har jagah
// header jodne ki jagah page load hote hi (React se pehle) fetch ko ek baar
// lapet dete hain. Token lib/api.ts login par "sl_token" me rakhta hai.
// Kisi aur site par token kabhi nahi jata; jisme pehle se Authorization hai
// (admin panel) use nahi chhedte.
const authFetchScript = `try{(function(){var o=window.fetch;if(!o||window.__slAF)return;window.__slAF=1;window.fetch=function(i,n){try{var u=typeof i==='string'?i:(i&&i.url)?i.url:String(i);if(u.indexOf('https://api.selectionlab.online')===0){var t=localStorage.getItem('sl_token');if(t){var h=new Headers((n&&n.headers)||(i&&i.headers)||undefined);if(!h.has('Authorization')){h.set('Authorization','Bearer '+t);n=Object.assign({},n||{},{headers:h});}}}}catch(e){}return o.call(window,i,n);};})();}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: authFetchScript }} />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${tinos.variable}`} style={{ margin: 0 }}>
        {/* Admin panel me "kaun online hai" isi se chalta hai. Kuch render nahi karta. */}
        <ActivityBeacon />
        {/* Google ke liye: ye site kiski hai aur search kaise hota hai */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_LD }} />
        {children}
      </body>
    </html>
  );
}
