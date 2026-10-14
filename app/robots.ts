import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// Test dene, result, login aur account wale pages Google me nahi aane chahiye —
// inpar "noindex" bhi laga hai (har folder ka layout.tsx). Yahan crawl bhi rokte hain
// taaki Google apna crawl budget asli pages (course, series, blog) par lagaye.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", "/profile-setup", "/my-learning", "/delete-account", "/login",
        "/mock-test/", "/descriptive-test/", "/excel-test/", "/excel-practice/", "/learn/",
        "/typing-test/", "/worksheet-test/", "/nbems-mock/result/", "/score-checker/result/",
        "/verify", "/search",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
