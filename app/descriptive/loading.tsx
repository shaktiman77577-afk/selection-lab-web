import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import { GridSkeleton, HeadSkeleton } from "@/app/components/v2/Skeleton";

export default function Loading() {
  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <HeadSkeleton />
        <GridSkeleton n={8} />
      </main>
    </V2Shell>
  );
}
