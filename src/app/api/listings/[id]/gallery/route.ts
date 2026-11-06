import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { SourceAuthError } from "@/lib/source-api";

export const maxDuration = 30;

const API_BASE = process.env.SOURCE_API_BASE ?? "https://api-dtk.thangbk.com";

type SourceImage = {
  image?: { url?: string };
  medium?: { url?: string };
  thumb?: { url?: string };
};

/**
 * GET /api/listings/:id/gallery
 * Fetches the full photo list for a listing from the source detail endpoint
 * (the search feed only returns the avatar). Uses the current user's token.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/bi-kip-tong/${id}`, {
      headers: {
        Accept: "application/json",
        "x-api-version": "v2",
        Authorization: `Bearer ${session.sourceToken}`,
      },
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403 || json?.code === 401) {
      throw new SourceAuthError();
    }
    const detail = json?.detail ?? json;
    const imgs: SourceImage[] = Array.isArray(detail?.images) ? detail.images : [];
    // Full-resolution urls, de-duplicated, keep order.
    const urls = Array.from(
      new Set(
        imgs
          .map((i) => i.image?.url || i.medium?.url || i.thumb?.url)
          .filter((u): u is string => !!u)
      )
    );
    return NextResponse.json({ images: urls, count: urls.length });
  } catch (e) {
    if (e instanceof SourceAuthError) {
      return NextResponse.json({ error: e.message, reauth: true }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không lấy được ảnh" },
      { status: 500 }
    );
  }
}
