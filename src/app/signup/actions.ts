"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/hash";

/**
 * 가입 직후 profiles 테이블에 생년월일 저장.
 * 쿠키 세션이 아직 서버에 전파되지 않을 수 있어 admin 클라이언트 사용.
 */
export async function updateProfileBirthDate(authUserId: string, birthDate: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ birth_date: birthDate } as never)
    .eq("auth_user_id", authUserId);

  if (error) {
    console.error("[voice-diary] 생년월일 저장 실패:", error);
    return { error: "생년월일 저장에 실패했습니다." };
  }
  return { ok: true };
}

/**
 * 가입 직후 보호자 등록.
 * authUserId를 직접 받아 admin 클라이언트로 처리 — 쿠키 타이밍 문제 회피.
 */
export async function registerGuardianAfterSignup(
  authUserId: string,
  guardianEmail: string,
  guardianName: string,
  guardianBirthDate: string,  // "1991-08-12" 형식
  pin: string,                 // 4자리 숫자
  userEmail: string,
  userBirthDate: string        // "1951-02-08" 형식
) {
  if (!guardianEmail) return { ok: true };

  const admin = createAdminClient();

  // auth_user_id로 profile.id 조회
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profileErr || !profile) {
    console.error("[voice-diary] 가입 시 profile 조회 실패:", profileErr);
    return { error: "프로필 정보를 찾을 수 없습니다." };
  }

  const passwordHash = hashPassword(pin);

  const { error } = await admin.from("guardians").insert({
    user_id:             profile.id,
    name:                guardianName || "보호자",
    email:               guardianEmail,
    user_email:          userEmail,
    user_birth_date:     userBirthDate,
    guardian_birth_date: guardianBirthDate,
    password_hash:       passwordHash,
  } as never);

  if (error) {
    console.error("[voice-diary] 가입 시 보호자 등록 실패:", error);
    return { error: "보호자 등록에 실패했습니다. 설정에서 다시 추가해주세요." };
  }
  return { ok: true };
}
