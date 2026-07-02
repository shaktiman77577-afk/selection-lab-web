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
  metadataBase: new URL("https://www.selectionlab.online"),
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
    url: "https://www.selectionlab.online",
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
  themeColor: "#0d0b08",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ margin: 0, background: "#0d0b08" }}>
        {children}
      </body>
    </html>
  );
}
