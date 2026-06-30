"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function addGuardian(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const guardianEmail = String(formData.get("guardianEmail") || "").trim();
  const guardianName = String(formData.get("guardianName") || "").trim();

  if (!guardianEmail) return { error: "보호자 이메일을 입력해주세요." };

  const { error } = await supabase.from("guardians").insert({
    user_id: user.id,
    guardian_email: guardianEmail,
    guardian_name: guardianName || null,
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

  const { error } = await supabase.from("guardians").delete().eq("id", guardianId).eq("user_id", user.id);
  if (error) {
    console.error("[voice-diary] 보호자 삭제 실패:", error);
    return { error: "삭제에 실패했습니다." };
  }
  revalidatePath("/settings");
  return { ok: true };
}
