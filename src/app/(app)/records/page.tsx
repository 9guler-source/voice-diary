import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import Link from "next/link";
import LocalTime from "@/components/LocalTime";
import FreeTalkPanel from "./FreeTalkPanel";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab === "freetalk" ? "freetalk" : "sessions";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="p-6 text-stone-400">로그인이 필요합니다.</p>;
  }

  const profile = await getOrCreateProfile(supabase, user);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, recorded_at, selected_questions, total_duration_sec")
    .eq("user_id", profile.id)
    .order("recorded_at", { ascending: false });

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-lg font-bold text-stone-800 mb-4">내 기록</h1>
        <div className="flex gap-2">
          <Link
            href="/records"
            className={`flex-1 text-center py-2 rounded-xl text-sm font-semibold ${
              tab === "sessions" ? "bg-brand-600 text-white" : "bg-white border border-stone-300 text-stone-500"
            }`}
          >
            전체 세션
          </Link>
          <Link
            href="/records?tab=freetalk"
            className={`flex-1 text-center py-2 rounded-xl text-sm font-semibold ${
              tab === "freetalk" ? "bg-brand-600 text-white" : "bg-white border border-stone-300 text-stone-500"
            }`}
          >
            자유이야기 모아듣기
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        {tab === "sessions" ? (
          !sessions || sessions.length === 0 ? (
            <EmptyState />
          ) : (
            sessions.map((s) => {
              const qCount = Array.isArray(s.selected_questions) ? s.selected_questions.length : 0;
              return (
                <Link key={s.id} href={`/records/${s.id}`} className="card flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-stone-800">
                      <LocalTime iso={s.recorded_at} />
                    </p>
                    <p className="text-xs text-stone-400 mt-1">{qCount}개 문항 녹음</p>
                  </div>
                  <span className="text-stone-300">›</span>
                </Link>
              );
            })
          )
        ) : (
          <FreeTalkPanel profileId={profile.id} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <p className="text-4xl mb-3">🎙️</p>
      <p className="text-stone-500">아직 기록한 이야기가 없어요</p>
      <Link href="/select-questions?mode=session" className="text-brand-600 font-semibold text-sm mt-2 inline-block">
        첫 이야기 남기러 가기
      </Link>
    </div>
  );
}
