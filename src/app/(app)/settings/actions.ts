"use server";

import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import { revalidatePath } from "next/cache";

export async function addGuardian(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const profile = await getOrCreateProfile(supabase, user);

  const email = String(formData.get("guardianEmail") || "").trim();
  const name = String(formData.get("guardianName") || "").trim();
  const relation = String(formData.get("guardianRelation") || "").trim();

  if (!email) return { error: "보호자 이메일을 입력해주세요." };
  if (!name) return { error: "보호자 이름을 입력해주세요." };

  const { error } = await supabase.from("guardians").insert({
    user_id: profile.id,
    name,
    email,
    relation: relation || null,
  } as never);

  if (error) {
    console.error("[voice-diary] 보호자 추가 실패:", error);
    return { error: "보호자 추가에 실패했습니다." };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteGuardian(guardianId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
