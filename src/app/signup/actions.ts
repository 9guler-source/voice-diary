"use server";

import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/hash";

/**
 * 가입 직후 profiles 테이블에 생년월일 저장
 */
export async function updateProfileBirthDate(birthDate: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인 세션을 찾을 수 없습니다." };

  const profile = await getOrCreateProfile(supabase, user);
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ birth_date: birthDate } as never)
    .eq("id", profile.id);

  if (error) {
    console.error("[voice-diary] 생년월일 저장 실패:", error);
    return { error: "생년월일 저장에 실패했습니다." };
  }
  return { ok: true };
}

/**
 * 가입 직후 보호자 등록 (생년월일 + 4자리 비밀번호 포함)
 */
export async function registerGuardianAfterSignup(
  guardianEmail: string,
  guardianName: string,
  guardianBirthDate: string,  // "1991-08-12" 형식
  pin: string,                 // 4자리 숫자
  userEmail: string,
  userBirthDate: string        // "1951-02-08" 형식
) {
  if (!guardianEmail) return { ok: true };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인 세션을 찾을 수 없습니다." };

  const profile = await getOrCreateProfile(supabase, user);
  const passwordHash = hashPassword(pin);

  const { error } = await supabase.from("guardians").insert({
    user_id: profile.id,
    name: guardianName || "보호자",
    email: guardianEmail,
    user_email: userEmail,
    user_birth_date: userBirthDate,
    guardian_birth_date: guardianBirthDate,
    password_hash: passwordHash,
  } as never);

  if (error) {
    console.error("[voice-diary] 가입 시 보호자 등록 실패:", error);
    return { error: "보호자 등록에 실패했습니다. 설정에서 다시 추가해주세요." };
  }
  return { ok: true };
}
