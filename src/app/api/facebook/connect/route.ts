import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { fbConfigured, oauthDialogUrl } from "@/lib/facebook";

// GET /api/facebook/connect → redirect the user to Facebook's OAuth dialog.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  if (!fbConfigured()) {
    return NextResponse.redirect(new URL("/dashboard?fb=notconfigured", req.url));
  }

  const origin = new URL(req.url).origin;
  const state = crypto.randomUUID();
  const store = await cookies();
  store.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(oauthDialogUrl(origin, state));
}
