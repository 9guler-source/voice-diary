"use server";

import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import { hashPassword } from "@/lib/hash";
import { generateGuardianPassword } from "@/lib/password-gen";
import { sendGuardianInviteEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

export async function addGuardian(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const profile = await getOrCreateProfile(supabase, user);

  const email = String(formData.get("guardianEmail") || "").trim().toLowerCase();
  const name = String(formData.get("guardianName") || "").trim();
  const relation = String(formData.get("guardianRelation") || "").trim();

  if (!email) return { error: "보호자 이메일을 입력해주세요." };
  if (!name) return { error: "보호자 이름을 입력해주세요." };

  // 이미 등록된 보호자인지 확인
  const { data: existing } = await supabase
    .from("guardians")
    .select("id")
    .eq("user_id", profile.id)
    .eq("email", email)
    .maybeSingle();

  if (existing) return { error: "이미 등록된 보호자 이메일입니다." };

  // 비밀번호 생성 및 해시
  const plainPassword = generateGuardianPassword();
  const passwordHash = hashPassword(plainPassword);

  const { error: insertError } = await supabase.from("guardians").insert({
    user_id: profile.id,
    name,
    email,
    relation: relation || null,
    user_email: user.email ?? "",
    password_hash: passwordHash,
  } as never);

  if (insertError) {
    console.error("[voice-diary] 보호자 추가 실패:", insertError);
    return { error: "보호자 추가에 실패했습니다." };
  }

  // 보호자에게 초대 메일 발송
  const mailResult = await sendGuardianInviteEmail({
    guardianEmail: email,
    guardianName: name,
    userEmail: user.email ?? "",
    generatedPassword: plainPassword,
  });

  revalidatePath("/settings");

  if (!mailResult.ok) {
    // 등록은 성공했지만 메일 발송 실패 — 사용자에게 알림
    return {
      ok: true,
      warning: `보호자 등록은 완료되었습니다. 단, ${mailResult.error ?? "안내 메일 발송에 실패했습니다."} 보호자에게 직접 로그인 정보를 전달해 주세요.`,
    };
  }

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
