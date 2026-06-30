"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export type RecordingMeta = {
  questionId: number;
  questionText: string;
  filePath: string;
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

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      selected_questions: selectedQuestionIds,
      recorded_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("[voice-diary] 세션 저장 실패:", sessionError);
    return { error: "세션 저장에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  const rows = recordings.map((r) => ({
    session_id: session.id,
    question_id: r.questionId,
    question_text: r.questionText,
    file_path: r.filePath,
    duration_seconds: r.durationSeconds,
  }));

  const { error: recError } = await supabase.from("recordings").insert(rows as never);

  if (recError) {
    console.error("[voice-diary] 녹음 메타 저장 실패:", recError);
    return { error: "녹음 정보 저장 중 일부 오류가 발생했습니다." };
  }

  revalidatePath("/records");
  revalidatePath("/home");
  return { sessionId: session.id };
}
