import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifyGuardianToken } from "@/lib/guardian-session";
import { createAdminClient } from "@/lib/supabase-admin";
import LocalTime from "@/components/LocalTime";

export default async function GuardianRecordsPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("vd_guardian_session")?.value;
  const payload = token ? verifyGuardianToken(token) : null;
  if (!payload) redirect("/guardian-login");

  const admin = createAdminClient();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, recorded_at, selected_questions, total_duration_sec")
    .eq("user_id", payload.uid)
    .eq("status", "completed")
    .order("recorded_at", { ascending: false });

  return (
    <div className="flex-1 flex flex-col px-5 pt-6 pb-10">
      <h1 className="text-lg font-bold text-stone-800 mb-1">녹음 기록</h1>
      <p className="text-xs text-stone-400 mb-5">
        총 {sessions?.length ?? 0}개의 세션 · 열람만 가능합니다
      </p>

      {!sessions || sessions.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🎙️</p>
          <p className="text-stone-400 text-sm">아직 녹음된 기록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const qCount = Array.isArray(s.selected_questions)
              ? s.selected_questions.length
              : 0;
            return (
              <Link
                key={s.id}
                href={`/guardian/records/${s.id}`}
                className="card flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-stone-800">
                    <LocalTime iso={s.recorded_at} />
                  </p>
                  <p className="text-xs text-stone-400 mt-1">{qCount}개 문항 녹음</p>
                </div>
                <span className="text-stone-300">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
