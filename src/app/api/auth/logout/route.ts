import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
import { sourceLogout } from "@/lib/source-api";

export async function POST() {
  const session = await getSession();
  if (session?.sourceToken) {
    // Release the source single-device slot so the user can log in on the
    // website / another device immediately after.
    await sourceLogout(session.sourceToken);
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
