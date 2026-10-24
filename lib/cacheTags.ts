// Website ka cache — kab dobara bane (Oct 2026).
//
// PEHLE: list pages (home, courses, mock-tests, descriptive, blog...) har 60
// second me dobara bante the. Vercel par har baar "ISR Write" gina jata tha —
// Hobby plan ki 200,000 ki mahine ki limit 2 hafte me khatam.
//
// AB: page tab tak cache me rehta hai jab tak admin kuch na badle. Admin panel
// me kuch save/delete hote hi backend (selection-lab-api, core/site_revalidate.py)
// /api/revalidate ko bata deta hai ki kaunsa data badla — sirf wahi pages naye
// bante hain. Har fetch par neeche wala "tag" laga hai, usi se pata chalta hai.
//
// Backup: koi revalidate call chhoot jaye, ya data apne aap time se badle
// (exam ka status "Apply open" -> "Closed", "N students enrolled recently") —
// tab bhi list pages 6 ghante me aur detail pages 1 din me khud naye ho jaate hain.
//
// Naya tag jodo to backend ke core/site_revalidate.py ke naksha me bhi jodo.
export const TAG = {
  courses: "courses",
  banners: "banners",
  featured: "featured",       // home carousel ki Featured series
  mocks: "mocks",
  descriptive: "descriptive",
  tier2: "tier2",
  blog: "blog",
  examUpdates: "exam-updates",
  ca: "ca",
} as const;

export const ALL_TAGS: string[] = Object.values(TAG);

// Backup time (second). Page ke `export const revalidate` me Next.js sirf seedha
// number maanta hai — wahan 21600 / 86400 likha hai, yahan badlo to wahan bhi.
export const LIST_TTL = 21600;     // 6 ghante — list pages
export const DETAIL_TTL = 86400;   // 1 din — blog post, course/series preview
