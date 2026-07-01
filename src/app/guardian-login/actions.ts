"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { verifyPassword } from "@/lib/hash";
import { createGuardianToken, GUARDIAN_COOKIE } from "@/lib/guardian-session";
import { parseBirthDate } from "@/lib/birthDate";

export async function guardianLogin(
  userEmail: string,
  userBirthDate: string,      // YYYYMMDD 형식
  guardianEmail: string,
  guardianBirthDate: string,  // YYYYMMDD 형식
  pin: string                  // 4자리 숫자
): Promise<{ ok: boolean; error?: string }> {
  if (!userEmail || !userBirthDate || !guardianEmail || !guardianBirthDate || !pin) {
    return { ok: false, error: "모든 항목을 입력해주세요." };
  }

  const parsedUserBirth = parseBirthDate(userBirthDate);
  if (!parsedUserBirth) return { ok: false, error: "사용자 생년월일 형식이 올바르지 않습니다. (예: 19510208)" };

  const parsedGuardianBirth = parseBirthDate(guardianBirthDate);
  if (!parsedGuardianBirth) return { ok: false, error: "보호자 생년월일 형식이 올바르지 않습니다. (예: 19910812)" };

  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "비밀번호는 숫자 4자리이어야 합니다." };

  const supabase = createClient();

  // 4인수 SECURITY DEFINER 함수 호출
  const { data, error } = await supabase.rpc("verify_guardian_login", {
    p_user_email:          userEmail.trim().toLowerCase(),
    p_guardian_email:      guardianEmail.trim().toLowerCase(),
    p_user_birth_date:     parsedUserBirth,
    p_guardian_birth_date: parsedGuardianBirth,
  });

  if (error) {
    console.error("[voice-diary] guardianLogin rpc 오류:", error);
    return { ok: false, error: "입력하신 정보를 다시 확인해주세요." };
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { ok: false, error: "입력하신 정보가 일치하지 않습니다." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.password_hash) return { ok: false, error: "입력하신 정보가 일치하지 않습니다." };

  // 4자리 PIN 검증
  const valid = verifyPassword(pin, row.password_hash);
  if (!valid) return { ok: false, error: "비밀번호가 올바르지 않습니다." };

  // 세션 쿠키 발급
  const token = createGuardianToken(row.guardian_id, row.user_profile_id);
  const cookieStore = cookies();
  cookieStore.set(GUARDIAN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return { ok: true };
}
