"use server";

import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import { hashPassword } from "@/lib/hash";
import { revalidatePath } from "next/cache";

export async function addGuardian(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const profile = await getOrCreateProfile(supabase, user);

  const email           = String(formData.get("guardianEmail") || "").trim().toLowerCase();
  const name            = String(formData.get("guardianName") || "").trim();
  const relation        = String(formData.get("guardianRelation") || "").trim();
  const guardianBirth   = String(formData.get("guardianBirthDate") || "").trim(); // "1991-08-12"
  const pin             = String(formData.get("guardianPin") || "").trim();

  if (!email)         return { error: "보호자 이메일을 입력해주세요." };
  if (!name)          return { error: "보호자 이름을 입력해주세요." };
  if (!guardianBirth) return { error: "보호자 생년월일을 입력해주세요." };
  if (!/^\d{4}$/.test(pin)) return { error: "비밀번호는 숫자 4자리이어야 합니다." };

  // 사용자 생년월일 조회 (로그인 검증용 캐시)
  const { data: profileData } = await supabase
    .from("profiles")
    .select("birth_date")
    .eq("id", profile.id)
    .maybeSingle();

  // 이미 등록된 보호자인지 확인
  const { data: existing } = await supabase
    .from("guardians")
    .select("id")
    .eq("user_id", profile.id)
    .eq("email", email)
    .maybeSingle();
  if (existing) return { error: "이미 등록된 보호자 이메일입니다." };

  const passwordHash = hashPassword(pin);

  const { error: insertError } = await supabase.from("guardians").insert({
    user_id:            profile.id,
    name,
    email,
    relation:           relation || null,
    user_email:         user.email ?? "",
    user_birth_date:    (profileData as any)?.birth_date ?? null,
    guardian_birth_date: guardianBirth,
    password_hash:      passwordHash,
  } as never);

  if (insertError) {
    console.error("[voice-diary] 보호자 추가 실패:", insertError);
    return { error: `보호자 추가에 실패했습니다. [${insertError.message}]` };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteGuardian(guardianId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const profile = await getOrCreateProfile(supabase, user);

  const { error } = await supabase
    .from("guardians")
    .delete()
    .eq("id", guardianId)
    .eq("user_id", profile.id);

  if (error) {
    console.error("[voice-diary] 보호자 삭제 실패:", error);
    return { error: "삭제에 실패했습니다." };
  }
  revalidatePath("/settings");
  return { ok: true };
}
