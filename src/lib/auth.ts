import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "dtk_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me-please-32b"
);

export type Session = {
  userId: string; // source user id (from JWT `id`)
  username: string; // phone number
  fullName?: string;
  sourceToken: string;
};

// Admin allowlist by phone number (username). Comma-separated in env; owner default.
const ADMIN_PHONES = (process.env.ADMIN_PHONES ?? "0379386629")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdminUsername(username?: string): boolean {
  return !!username && ADMIN_PHONES.includes(username);
}

export async function createSession(data: Session) {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: (payload.userId as string) ?? (payload.username as string),
      username: payload.username as string,
      fullName: payload.fullName as string | undefined,
      sourceToken: payload.sourceToken as string,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
