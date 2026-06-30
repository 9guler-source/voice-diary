import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import Link from "next/link";
import LocalTime from "@/components/LocalTime";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let sessionCount = 0;
  let lastRecordedAt: string | null = null;

  if (user) {
    const profile = await getOrCreateProfile(supabase, user);
    displayName = profile.name;

    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id);
    sessionCount = count ?? 0;

    const { data: lastSession } = await supabase
      .from("sessions")
      .select("recorded_at")
      .eq("user_id", profile.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastRecordedAt = lastSession?.recorded_at ?? null;
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-10 pb-6">
      <div className="mb-8">
        <p className="text-stone-500">안녕하세요, {displayName ? `${displayName}님` : "회원님"}</p>
        <h1 className="text-xl font-bold text-stone-800 mt-1">오늘도 이야기를 들려주세요</h1>
      </div>

      <div className="card bg-gradient-to-br from-brand-500 to-brand-600 text-white border-none mb-6">
        <p className="text-sm opacity-90">지금까지 남긴 이야기</p>
        <p className="text-3xl font-bold mt-1">{sessionCount}개의 세션</p>
        {lastRecordedAt && (
          <p className="text-xs opacity-80 mt-2">
            마지막 기록: <LocalTime iso={lastRecordedAt} showTime={false} />
          </p>
        )}
      </div>

      <Link href="/select-questions?mode=session" className="btn-primary text-center text-lg !py-5 mb-4">
        🎙️ 녹음 시작
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/records" className="btn-secondary text-center">
          📼 내 기록 보기
        </Link>
        <Link href="/settings" className="btn-secondary text-center">
          ⚙️ 설정
        </Link>
      </div>

      <p className="text-xs text-stone-400 text-center mt-auto pt-10">
        기억이 흐려지기 전에, 지금 목소리로 남겨두세요.
      </p>
    </div>
  );
}
