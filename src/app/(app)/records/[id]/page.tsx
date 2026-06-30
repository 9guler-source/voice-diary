import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { formatDateTimeKo } from "@/lib/dateUtils";
import SessionPlayer from "./SessionPlayer";

const BUCKET = "voice-diary";

export default async function SessionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, recorded_at, title, user_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!session || session.user_id !== user.id) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-stone-400">기록을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { data: recordings } = await supabase
    .from("recordings")
    .select("id, question_id, question_text, file_path, duration_seconds, created_at")
    .eq("session_id", session.id)
    .order("question_id", { ascending: true });

  const withUrls = await Promise.all(
    (recordings ?? []).map(async (r) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.file_path, 3600);
      return {
        id: r.id,
        questionId: r.question_id,
        questionText: r.question_text,
        durationSeconds: r.duration_seconds ?? 0,
        url: data?.signedUrl ?? "",
      };
    })
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-lg font-bold text-stone-800">
          {session.title || formatDateTimeKo(session.recorded_at)}
        </h1>
        <p className="text-xs text-stone-400 mt-1">{withUrls.length}개 문항</p>
      </div>
      <SessionPlayer items={withUrls} />
    </div>
  );
}
