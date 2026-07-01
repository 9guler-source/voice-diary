import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GUARDIAN_COOKIE } from "@/lib/guardian-session";

export async function POST() {
  const cookieStore = cookies();
  cookieStore.set(GUARDIAN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // 즉시 만료
    path: "/",
  });
  return NextResponse.json({ ok: true });
}
