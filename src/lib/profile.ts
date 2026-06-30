import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  auth_user_id: string;
  name: string;
};

/**
 * 실제 DB 구조: sessions.user_id / guardians.user_id / user_questions.user_id는
 * auth.uid()가 아니라 voice_diary.profiles.id를 참조합니다.
 * profiles.auth_user_id가 로그인 사용자와의 연결고리입니다.
 *
 * 가입 시 트리거(006_fix_profile_link.sql)가 자동으로 profile을 만들어주지만,
 * 트리거 누락/지연 등에 대비해 여기서도 없으면 생성합니다.
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient,
  user: User
): Promise<Profile> {
  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id, auth_user_id, name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (selectError) {
    console.error("[voice-diary] profile 조회 실패:", selectError);
  }

  if (existing) return existing as Profile;

  const fallbackName =
    (user.user_metadata?.display_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "사용자";

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ auth_user_id: user.id, name: fallbackName } as never)
    .select("id, auth_user_id, name")
    .single();

  if (insertError || !created) {
    console.error("[voice-diary] profile 자동 생성 실패:", insertError);
    throw new Error("프로필 정보를 불러올 수 없습니다.");
  }

  return created as Profile;
}
