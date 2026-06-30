"use server";

import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import { revalidatePath } from "next/cache";

export type RecordingMeta = {
  questionId: number;
  questionOrder: number;
  isFreeTalk: boolean;
  audioPath: string; // Storage 상의 파일 경로 (private 버킷, 재생 시 signed URL 생성)
  durationSeconds: number;
};

export async function saveSession(
  selectedQuestionIds: number[],
  recordings: RecordingMeta[]
): Promise<{ sessionId: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };
  if (recordings.length === 0) return { error: "저장할 녹음이 없습니다." };

  let profile;
  try {
    profile = await getOrCreateProfile(supabase, user);
  } catch {
    return { error: "프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  const totalDuration = recordings.reduce((sum, r) => sum + (r.durationSeconds || 0), 0);

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: profile.id,
      selected_questions: selectedQuestionIds,
      recorded_at: new Date().toISOString(),
      status: "completed",
      total_duration_sec: totalDuration,
    } as never)
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("[voice-diary] 세션 저장 실패:", sessionError);
    return {
      error: `세션 저장에 실패했습니다. [디버그: ${sessionError?.message ?? "알 수 없는 오류"} / code: ${sessionError?.code ?? "-"}]`,
    };
  }

  const rows = recordings.map((r) => ({
    session_id: session.id,
    question_id: r.questionId,
    question_order: r.questionOrder,
    is_free_talk: r.isFreeTalk,
    audio_url: r.audioPath,
    duration_sec: r.durationSeconds,
  }));

  const { error: recError } = await supabase.from("recordings").insert(rows as never);

  if (recError) {
    console.error("[voice-diary] 녹음 메타 저장 실패:", recError);
    return {
      error: `녹음 정보 저장 중 오류가 발생했습니다. [디버그: ${recError.message} / code: ${recError.code}]`,
    };
  }

  revalidatePath("/records");
  revalidatePath("/home");
  return { sessionId: session.id };
}
