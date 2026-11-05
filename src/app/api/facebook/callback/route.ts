import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { socialAccounts } from "@/db/schema";
import {
  exchangeCodeForToken,
  exchangeForLongLived,
  getMe,
  getPages,
  fbConfigured,
} from "@/lib/facebook";

// GET /api/facebook/callback?code=...&state=...
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (!fbConfigured()) return NextResponse.redirect(new URL("/dashboard?fb=notconfigured", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL("/dashboard?fb=cancelled", req.url));

  const store = await cookies();
  const savedState = store.get("fb_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/dashboard?fb=badstate", req.url));
  }
  store.delete("fb_oauth_state");

  try {
    const short = await exchangeCodeForToken(code, url.origin);
    if (!short.access_token) throw new Error(short.error?.message || "Không lấy được token");

    const long = await exchangeForLongLived(short.access_token);
    const userToken = long.access_token || short.access_token;

    const me = await getMe(userToken);
    const pages = await getPages(userToken);

    const now = new Date();
    const id = `facebook:${session.userId}`;
    await db
      .insert(socialAccounts)
      .values({
        id,
        userId: session.userId,
        provider: "facebook",
        externalId: me.id ?? null,
        name: me.name ?? null,
        userAccessToken: userToken,
        pages: pages.map((p) => ({ id: p.id, name: p.name, accessToken: p.access_token, category: p.category })),
        expiresAt: long.expires_in ? Math.floor(Date.now() / 1000) + long.expires_in : null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: socialAccounts.id,
        set: {
          externalId: me.id ?? null,
          name: me.name ?? null,
          userAccessToken: userToken,
          pages: pages.map((p) => ({ id: p.id, name: p.name, accessToken: p.access_token, category: p.category })),
          expiresAt: long.expires_in ? Math.floor(Date.now() / 1000) + long.expires_in : null,
          updatedAt: now,
        },
      });

    return NextResponse.redirect(new URL("/dashboard?fb=connected", req.url));
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "error");
    return NextResponse.redirect(new URL(`/dashboard?fb=error&msg=${msg}`, req.url));
  }
}
