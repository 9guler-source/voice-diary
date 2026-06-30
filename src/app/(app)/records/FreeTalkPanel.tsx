import { createClient } from "@/lib/supabase-server";
import { formatDateTimeKo } from "@/lib/dateUtils";

const BUCKET = "voice-diary";

export default async function FreeTalkPanel({ profileId }: { profileId: string }) {
  const supabase = createClient();

  // free_talk_view: recording_id, session_id, user_id, recorded_at, duration_sec, audio_url, stt_text
  const { data: recordings, error } = await supabase
    .from("free_talk_view")
    .select("recording_id, recorded_at, duration_sec, audio_url, stt_text")
    .eq("user_id", profileId)
    .order("recorded_at", { ascending: false });

  if (error) {
    console.error("[voice-diary] 자유이야기 조회 실패:", error);
  }

  if (!recordings || recordings.length === 0) {
    return <p className="text-center text-stone-400 py-16">아직 자유이야기 기록이 없어요</p>;
  }

  const withUrls = await Promise.all(
    recordings.map(async (r) => {
      if (!r.audio_url) return { ...r, url: null as string | null };
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.audio_url, 3600);
      return { ...r, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-3">
      {withUrls.map((r) => (
        <div key={r.recording_id} className="card">
          <p className="text-xs text-stone-400 mb-2">{formatDateTimeKo(r.recorded_at)}</p>
          {r.url ? (
            <audio src={r.url} controls className="w-full" />
          ) : (
            <p className="text-sm text-red-500">재생 링크를 불러올 수 없습니다.</p>
          )}
          {r.stt_text && <p className="text-xs text-stone-400 mt-2">{r.stt_text}</p>}
        </div>
      ))}
    </div>
  );
}
