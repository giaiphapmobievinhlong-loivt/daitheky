import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
import { sourceLogout } from "@/lib/source-api";

// Logout frees the source single-device slot so the user can sign in again on
// another browser / the website. (The source allows only one active device at
// a time, so "log out here, then log in there" is the reliable way to switch.)
export async function POST() {
  const session = await getSession();
  if (session?.sourceToken) {
    await sourceLogout(session.sourceToken);
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
