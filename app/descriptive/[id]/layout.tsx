// Link preview (WhatsApp / Telegram) aur Google ke liye — page "use client"
// hai, isliye naam, description, image aur schema yahan server par banta hai.
import type { Metadata } from "next";
import { getShare, shareMeta, shareJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return shareMeta(await getShare("descriptive", id), `/descriptive/${id}`, "Descriptive Test Series");
}

export default async function Layout({ children, params }: Props & { children: React.ReactNode }) {
  const { id } = await params;
  const ld = shareJsonLd(await getShare("descriptive", id), `/descriptive/${id}`);
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
      {children}
    </>
  );
}
