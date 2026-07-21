import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

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
