import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// Local-only logout: clears this app's session cookie but does NOT call the
// source /auth/logout. Because the app now logs in with the same browser
// fingerprint as the website (same source "device"), releasing it here would
// also sign the user out of tuan123.daitheky.net. Keeping it local lets both
// stay signed in together.
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
