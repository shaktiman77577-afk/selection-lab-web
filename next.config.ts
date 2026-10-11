import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Typing ki sound files (key/room) — browser 1 saal tak cache rakhe.
  // File badlo to lib/typingSound.ts me VERSION badha do (?v=) — nayi file aa jayegi.
  async headers() {
    return [
      {
        source: "/sounds/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  // Firebase Auth reverse proxy (Firebase docs "Option 3").
  // Forwards the auth handshake from our own domain to firebaseapp.com so the
  // Google sign-in flow is first-party and works on mobile browsers that block
  // third-party storage. Must be a transparent proxy (rewrite), NOT a redirect
  // — so it lives in beforeFiles.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/__/auth/:path*",
          destination: "https://selection-lab.firebaseapp.com/__/auth/:path*",
        },
        {
          source: "/__/firebase/:path*",
          destination: "https://selection-lab.firebaseapp.com/__/firebase/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
