import { createClient } from "@/lib/supabase-server";
import { formatDateTimeKo } from "@/lib/dateUtils";

const FREE_TALK_QUESTION_ID = 71;
const BUCKET = "voice-diary";

export default async function FreeTalkPanel({ userId }: { userId: string }) {
  const supabase = createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, recorded_at")
    .eq("user_id", userId);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) {
    return <p className="text-center text-stone-400 py-16">아직 자유이야기 기록이 없어요</p>;
  }

  const { data: recordings } = await supabase
    .from("recordings")
    .select("id, session_id, file_path, duration_seconds, created_at")
    .eq("question_id", FREE_TALK_QUESTION_ID)
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  if (!recordings || recordings.length === 0) {
    return <p className="text-center text-stone-400 py-16">아직 자유이야기 기록이 없어요</p>;
  }

  const withUrls = await Promise.all(
    recordings.map(async (r) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.file_path, 3600);
      return { ...r, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-3">
      {withUrls.map((r) => (
        <div key={r.id} className="card">
          <p className="text-xs text-stone-400 mb-2">{formatDateTimeKo(r.created_at)}</p>
          {r.url ? (
            <audio src={r.url} controls className="w-full" />
          ) : (
            <p className="text-sm text-red-500">재생 링크를 불러올 수 없습니다.</p>
          )}
        </div>
      ))}
    </div>
  );
}
