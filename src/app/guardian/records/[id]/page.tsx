import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { isGuardianEmail } from "@/lib/guardian-email";
import { getQuestionById } from "@/lib/questions";
import LocalTime from "@/components/LocalTime";
import SessionPlayer from "@/components/SessionPlayer";

const BUCKET = "voice-diary";

export default async function GuardianSessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isGuardianEmail(user.email ?? "")) {
    redirect("/guardian-login");
  }

  // 보호자 행 조회
  const { data: guardian } = await supabase
    .from("guardians")
    .select("user_id")
    .eq("guardian_auth_id", user.id)
    .maybeSingle();

  if (!guardian) redirect("/guardian-login");

  // 세션 조회 — RLS(sessions_guardian_read)가 담당 사용자 소유 세션만 허용
  const { data: session } = await supabase
    .from("sessions")
    .select("id, recorded_at, user_id")
    .eq("id", params.id)
    .eq("user_id", guardian.user_id) // 명시적으로도 필터 (이중 보호)
    .maybeSingle();

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-stone-400">기록을 찾을 수 없습니다.</p>
      </div>
    );
  }

  // recordings 조회 — RLS(recordings_guardian_read) 자동 적용
  const { data: recordings } = await supabase
    .from("recordings")
    .select("id, question_id, question_order, audio_url, duration_sec")
    .eq("session_id", session.id)
    .order("question_order", { ascending: true });

  // signed URL 생성 — Storage RLS가 guardian을 허용하지 않아 admin 클라이언트 사용
  // (단, 이미 위에서 RLS로 해당 세션 접근 권한 검증 완료됨)
  const admin = createAdminClient();
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
