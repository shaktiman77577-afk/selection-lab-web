import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://selectionlab.in"),
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
  openGraph: {
    type: "website",
    url: "https://selectionlab.in",
    siteName: "Selection Lab",
    title: "Selection Lab — Government Exam Preparation",
    description:
      "Courses, mock tests, PYQs and daily quizzes for SSC, IB, Railways and more. Learn in Hindi and English with Nikki Ma'am.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Selection Lab",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Selection Lab — Government Exam Preparation",
    description:
      "Courses, mock tests, PYQs and daily quizzes for SSC, IB, Railways and more.",
    images: ["/logo.png"],
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

const themeScript = `try{if(localStorage.getItem('sl-theme')==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
