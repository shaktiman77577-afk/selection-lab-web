// POST /api/revalidate — backend batata hai "ye data badla", aur sirf us data
// wale pages agli visit par naye bante hain. Dekho lib/cacheTags.ts.
//
// Sirf backend bula sakta hai: header "x-revalidate-secret" me wahi value
// chahiye jo Vercel ke REVALIDATE_SECRET me hai (Railway me bhi same).
//
// Body: { "tags": ["mocks", "featured"] }
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { ALL_TAGS } from "@/lib/cacheTags";

const ALLOWED = new Set(ALL_TAGS);

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const secret = (process.env.REVALIDATE_SECRET || "").trim();
  const given = (req.headers.get("x-revalidate-secret") || "").trim();
  if (!secret || !sameSecret(given, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    // khaali / galat body — neeche 0 tags
  }
  const raw: unknown[] = Array.isArray(body?.tags) ? body.tags : [];
  const tags = Array.from(new Set(raw.filter((t): t is string => typeof t === "string" && ALLOWED.has(t))));

  // { expire: 0 } = turant purana. Agli visit par naya page banta hai
  // (bahar se aane wale webhook ke liye Next.js 16 ka yahi tarika hai).
  for (const t of tags) revalidateTag(t, { expire: 0 });

  return NextResponse.json({ ok: true, revalidated: tags });
}
