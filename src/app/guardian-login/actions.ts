"use server";

import { createClient } from "@/lib/supabase-server";
import { parseBirthDate } from "@/lib/birthDate";
import { deriveGuardianPassword } from "@/lib/guardian-email";

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

  // ① SECURITY DEFINER 함수로 4개 값 검증 + 합성 이메일 조회
  const { data, error: rpcError } = await supabase.rpc("verify_guardian_login", {
    p_user_email:          userEmail.trim().toLowerCase(),
    p_guardian_email:      guardianEmail.trim().toLowerCase(),
    p_user_birth_date:     parsedUserBirth,
    p_guardian_birth_date: parsedGuardianBirth,
  });

  if (rpcError) {
    console.error("[voice-diary] guardianLogin rpc 오류:", rpcError.message);
    return { ok: false, error: '입력하신 정보를 다시 확인해주세요.' };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return { ok: false, error: "입력하신 정보가 일치하지 않습니다." };
  }

  // 구버전 보호자 (synthetic_email 없음) 안내
  if (!row.guardian_synthetic_email) {
    return {
      ok: false,
      error: "이 보호자 계정은 구 방식으로 등록되어 있습니다. 사용자 계정에서 보호자를 삭제하고 다시 등록해주세요.",
    };
  }

  // ② PIN + 생년월일로 Supabase 비밀번호 재생성 (등록 시와 동일 방식)
  const derivedPassword = deriveGuardianPassword(pin, parsedUserBirth, parsedGuardianBirth);

  // ③ 합성 이메일 계정으로 Supabase 로그인 → 정규 세션 쿠키 발급
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: row.guardian_synthetic_email,
    password: derivedPassword,
  });

  if (signInError) {
    console.error("[voice-diary] 보호자 signIn 실패:", signInError.message);
    return { ok: false, error: "비밀번호가 올바르지 않습니다." };
  }

  return { ok: true };
}
