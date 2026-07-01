"use server";

import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";

/** 가입 직후 생년월일만 저장 */
export async function saveAfterSignup(birthDate: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "세션 오류" };

  const profile = await getOrCreateProfile(supabase, user);
  await supabase
    .from("profiles")
    .update({ birth_date: birthDate } as never)
    .eq("id", profile.id);

  return { ok: true };
}
