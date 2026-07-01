"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getOrCreateProfile } from "@/lib/profile";
import { generateGuardianEmail, deriveGuardianPassword } from "@/lib/guardian-email";
import { revalidatePath } from "next/cache";

/** 사용자 본인 생년월일을 프로필에 저장 */
export async function updateMyBirthDate(birthDate: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const profile = await getOrCreateProfile(supabase, user);
  const { error } = await supabase
    .from("profiles")
    .update({ birth_date: birthDate } as never)
    .eq("id", profile.id);

  if (error) return { error: `생년월일 저장 실패 [${error.message}]` };
  revalidatePath("/settings");
  return { ok: true };
}

export async function addGuardian(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const profile = await getOrCreateProfile(supabase, user);

  const email         = String(formData.get("guardianEmail") || "").trim().toLowerCase();
  const name          = String(formData.get("guardianName") || "").trim();
  const relation      = String(formData.get("guardianRelation") || "").trim();
  const guardianBirth = String(formData.get("guardianBirthDate") || "").trim(); // "1991-08-12"
  const pin           = String(formData.get("guardianPin") || "").trim();

  if (!email)         return { error: "보호자 이메일을 입력해주세요." };
  if (!name)          return { error: "보호자 이름을 입력해주세요." };
  if (!guardianBirth) return { error: "보호자 생년월일을 입력해주세요." };
  if (!/^\d{4}$/.test(pin)) return { error: "비밀번호는 숫자 4자리이어야 합니다." };

  // 사용자 생년월일 확인 (로그인 검증용 + 비밀번호 유도에 필요)
  const { data: profileData } = await supabase
    .from("profiles")
    .select("birth_date")
    .eq("id", profile.id)
    .maybeSingle();

  const userBirthDate = (profileData as any)?.birth_date ?? null;
  if (!userBirthDate) {
    return { error: "보호자를 등록하려면 먼저 본인 생년월일을 설정해야 합니다. 위 '내 생년월일' 항목에서 입력해주세요." };
  }

  // 중복 확인
  const { data: existing } = await supabase
    .from("guardians")
    .select("id")
    .eq("user_id", profile.id)
    .eq("email", email)
    .maybeSingle();
  if (existing) return { error: "이미 등록된 보호자 이메일입니다." };

  // ① 결정적 합성 이메일 생성 (사용자+보호자 이메일 조합, 중복 불가)
  const syntheticEmail = generateGuardianEmail(user.email ?? "", email);
  console.log(`[voice-diary] 보호자 합성 이메일: ${syntheticEmail}`);

  // ② Supabase Auth 계정 생성 (email_confirm: true → 이메일 인증 불필요)
  const derivedPassword = deriveGuardianPassword(pin, userBirthDate, guardianBirth);
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: derivedPassword,
    email_confirm: true,  // 이메일 인증 없이 즉시 활성화
  });

  if (authError || !authData.user) {
    console.error("[voice-diary] 보호자 Auth 계정 생성 실패:", authError?.message);
    return { error: `보호자 계정 생성 실패 [${authError?.message}]` };
  }

  // ③ guardians 테이블 INSERT
  const { error: insertError } = await supabase.from("guardians").insert({
    user_id:                  profile.id,
    name,
    email,
    relation:                 relation || null,
    user_email:               user.email ?? "",
    user_birth_date:          userBirthDate,
    guardian_birth_date:      guardianBirth,
    guardian_auth_id:         authData.user.id,
    guardian_synthetic_email: syntheticEmail,
  } as never);

  if (insertError) {
    // 롤백: 생성한 Auth 계정 삭제
    await admin.auth.admin.deleteUser(authData.user.id);
    console.error("[voice-diary] 보호자 insert 실패 (롤백됨):", insertError.message);
    return { error: `보호자 추가 실패 [${insertError.message} / code: ${insertError.code}]` };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteGuardian(guardianId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const profile = await getOrCreateProfile(supabase, user);

  // guardian_auth_id 조회 (Auth 계정 삭제에 필요)
  const { data: guardian } = await supabase
    .from("guardians")
    .select("id, guardian_auth_id")
    .eq("id", guardianId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!guardian) return { error: "보호자를 찾을 수 없습니다." };

  // DB에서 삭제
  const { error } = await supabase
    .from("guardians")
    .delete()
    .eq("id", guardianId)
    .eq("user_id", profile.id);

  if (error) {
    console.error("[voice-diary] 보호자 삭제 실패:", error);
    return { error: "삭제에 실패했습니다." };
  }

  // Supabase Auth 계정 즉시 삭제 → 기존 세션 즉시 무효화 (7일 대기 없음)
  if (guardian.guardian_auth_id) {
    const admin = createAdminClient();
    const { error: authDelError } = await admin.auth.admin.deleteUser(guardian.guardian_auth_id);
    if (authDelError) {
      console.warn("[voice-diary] 보호자 Auth 계정 삭제 실패 (DB는 삭제됨):", authDelError.message);
    }
  }

  revalidatePath("/settings");
  return { ok: true };
}
