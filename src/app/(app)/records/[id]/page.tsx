import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { formatDateTimeKo } from "@/lib/dateUtils";
import { getQuestionById } from "@/lib/questions";
import SessionPlayer from "./SessionPlayer";

const BUCKET = "voice-diary";

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user);

  const { data: session } = await supabase
    .from("sessions")
    .select("id, recorded_at, user_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!session || session.user_id !== profile.id) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-stone-400">기록을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { data: recordings } = await supabase
    .from("recordings")
    .select("id, question_id, question_order, audio_url, duration_sec")
    .eq("session_id", session.id)
    .order("question_order", { ascending: true });

  const withUrls = await Promise.all(
    (recordings ?? []).map(async (r) => {
      const q = getQuestionById(r.question_id);
      const { data } = r.audio_url
        ? await supabase.storage.from(BUCKET).createSignedUrl(r.audio_url, 3600)
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
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-lg font-bold text-stone-800">{formatDateTimeKo(session.recorded_at)}</h1>
        <p className="text-xs text-stone-400 mt-1">{withUrls.length}개 문항</p>
      </div>
      <SessionPlayer items={withUrls} />
    </div>
  );
}
