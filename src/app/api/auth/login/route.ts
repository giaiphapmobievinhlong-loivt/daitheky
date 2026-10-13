import { NextResponse } from "next/server";
import { z } from "zod";
import { sourceLogin } from "@/lib/source-api";
import { createSession } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
  }
  try {
    const { accessToken, user } = await sourceLogin(
      parsed.data.username,
      parsed.data.password
    );
    await createSession({
      username: parsed.data.username,
      fullName: (user?.full_name as string) || parsed.data.username,
      sourceToken: accessToken,
    });
    return NextResponse.json({ ok: true, fullName: user?.full_name ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Đăng nhập thất bại" },
      { status: 401 }
    );
  }
}
