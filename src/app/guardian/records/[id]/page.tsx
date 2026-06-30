import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyGuardianToken } from "@/lib/guardian-session";
import { createAdminClient } from "@/lib/supabase-admin";
import { getQuestionById } from "@/lib/questions";
import LocalTime from "@/components/LocalTime";
import SessionPlayer from "@/app/(app)/records/[id]/SessionPlayer";

const BUCKET = "voice-diary";

export default async function GuardianSessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();
  const token = cookieStore.get("vd_guardian_session")?.value;
  const payload = token ? verifyGuardianToken(token) : null;
  if (!payload) redirect("/guardian-login");

  const admin = createAdminClient();

  // 세션이 열람 권한이 있는 사용자 소유인지 확인
  const { data: session } = await admin
    .from("sessions")
    .select("id, recorded_at, user_id")
    .eq("id", params.id)
    .eq("user_id", payload.uid) // 반드시 본인 소유 세션만
    .maybeSingle();

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-stone-400">기록을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { data: recordings } = await admin
    .from("recordings")
    .select("id, question_id, question_order, audio_url, duration_sec")
    .eq("session_id", session.id)
    .order("question_order", { ascending: true });

  // signed URL 생성 (1시간 유효)
  const withUrls = await Promise.all(
    (recordings ?? []).map(async (r) => {
      const q = getQuestionById(r.question_id);
      const { data } = r.audio_url
        ? await admin.storage.from(BUCKET).createSignedUrl(r.audio_url, 3600)
        : { data: null };
      return {
        id: r.id,
        questionId: r.question_id,
        questionText: q?.questionText ?? `문항 ${r.question_id}`,
        durationSeconds: r.duration_sec ?? 0,
        url: data?.signedUrl ?? "",
      };
    })
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5 pb-2">
        <h1 className="text-lg font-bold text-stone-800">
          <LocalTime iso={session.recorded_at} />
        </h1>
        <p className="text-xs text-stone-400 mt-1">{withUrls.length}개 문항</p>
      </div>
      <SessionPlayer items={withUrls} />
    </div>
  );
}
