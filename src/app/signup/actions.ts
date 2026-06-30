"use server";

import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";

export async function registerGuardianAfterSignup(guardianEmail: string, guardianName: string) {
  if (!guardianEmail) return { ok: true };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인 세션을 찾을 수 없습니다." };

  const profile = await getOrCreateProfile(supabase, user);

  const { error } = await supabase.from("guardians").insert({
    user_id: profile.id,
    name: guardianName || "보호자",
    email: guardianEmail,
  } as never);

  if (error) {
    console.error("[voice-diary] 가입 시 보호자 등록 실패:", error);
    return { error: "보호자 등록에 실패했습니다. 설정에서 다시 추가해주세요." };
  }
  return { ok: true };
}
