/**
 * lib/officeAccess.ts — Word / PowerPoint practice ka lock.
 *
 * Har app (Word, PPT) ka PEHLA task free. Baaki tabhi khulte hain jab NBEMS
 * Tier 2 series kharidi ho (ya series free ho). Series ?s=<id> se aati hai;
 * na ho (jaise side menu se) to list me se NBEMS wali dhoondh lete hain.
 */
import { useEffect, useState } from "react";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { WORD_TASKS, PPT_TASKS } from "@/lib/officeTasks";

const FREE_IDS = new Set([WORD_TASKS[0]?.id, PPT_TASKS[0]?.id].filter(Boolean) as string[]);

export const isFreeOfficeTask = (id?: string) => !!id && FREE_IDS.has(id);

export function useOfficeAccess() {
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seriesId, setSeriesId] = useState<number>(0);

  useEffect(() => {
    const uid = (getUser() as any)?.id;
    const want = Number(new URLSearchParams(window.location.search).get("s") || 0);
    const q = uid ? `user_id=${uid}` : "";
    const pick = want
      ? fetch(`${API_URL}/tier2/series/${want}${q ? `?${q}` : ""}`).then((r) => r.json())
          .then((d) => ({ id: want, owned: !!d?.is_purchased || Number(d?.series?.price ?? 1) <= 0 }))
      : fetch(`${API_URL}/tier2/series?platform=web${q ? `&${q}` : ""}`).then((r) => r.json())
          .then((d) => {
            const s = (d?.series || []).find((x: any) => /nbems/i.test(x.title || ""));
            return { id: s?.id || 0, owned: !!s && (!!s.is_purchased || Number(s.price ?? 1) <= 0) };
          });
    pick.then((x) => { setSeriesId(x.id); setOwned(x.owned); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /** Task khula hai? (loading ke dauran sirf free wale) */
  const canOpen = (id?: string) => isFreeOfficeTask(id) || owned;
  /** Unlock kahan: login, warna NBEMS series ka kharidne wala page */
  const unlockHref = () => (!getUser() ? "/login" : seriesId ? `/tier2?s=${seriesId}` : "/tier2");

  return { owned, loading, seriesId, canOpen, unlockHref };
}
