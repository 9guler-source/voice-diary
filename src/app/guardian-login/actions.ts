"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { verifyPassword } from "@/lib/hash";
import { createGuardianToken, GUARDIAN_COOKIE } from "@/lib/guardian-session";

export async function guardianLogin(
  userEmail: string,
  guardianEmail: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!userEmail || !guardianEmail || !password) {
    return { ok: false, error: "모든 항목을 입력해주세요." };
  }

  const supabase = createClient();

  // SECURITY DEFINER 함수 호출 — RLS 우회하여 보호자 정보 조회
  const { data, error } = await supabase.rpc("verify_guardian_login", {
    p_user_email: userEmail.trim().toLowerCase(),
    p_guardian_email: guardianEmail.trim().toLowerCase(),
  });

  if (error) {
    console.error("[voice-diary] guardianLogin rpc 오류:", error);
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.password_hash) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  // Node.js crypto로 비밀번호 검증 (scrypt, 타이밍 공격 방지)
  const valid = verifyPassword(password, row.password_hash);
  if (!valid) {
    return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  // 세션 토큰 생성 및 쿠키 저장
  const token = createGuardianToken(row.guardian_id, row.user_profile_id);

  const cookieStore = cookies();
  cookieStore.set(GUARDIAN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7일 (초 단위)
    path: "/",
  });

  return { ok: true };
}
