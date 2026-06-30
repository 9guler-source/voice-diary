"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getQuestionById, type Question } from "@/lib/questions";
import { useRecording } from "@/hooks/useRecording";
import { useTTS } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import { saveSession, type RecordingMeta } from "./actions";

const CAPTIONS_KEY = "voice_diary_captions_enabled";
const BUCKET = "voice-diary";

function extFromMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("webm")) return "webm";
  return "audio";
}

type Phase = "intro" | "ready" | "recording" | "stopped" | "uploading";

export default function SessionRecorder({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const { speak, cancel: cancelTTS, isSpeaking } = useTTS();
  const stt = useSTT();
  const recording = useRecording();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [captionsOn, setCaptionsOn] = useState(true);
  const [finishedRecordings, setFinishedRecordings] = useState<RecordingMeta[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const sessionTempId = useRef<string>("");

  useEffect(() => {
    const raw = sessionStorage.getItem("voice_diary_selected_questions");
    if (!raw) {
      router.replace("/select-questions");
      return;
    }
    const ids: number[] = JSON.parse(raw);
    const qs = ids.map((id) => getQuestionById(id)).filter(Boolean) as Question[];
    if (qs.length === 0) {
      router.replace("/select-questions");
      return;
    }
    setQuestions(qs);
    sessionTempId.current =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;

    try {
      const saved = localStorage.getItem(CAPTIONS_KEY);
      if (saved !== null) setCaptionsOn(saved === "true");
    } catch {
      // 무시
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  // 문항이 바뀔 때마다 TTS로 질문 읽어주기 (전환 문구 마스킹 포함된 ttsText 사용)
  useEffect(() => {
    if (!current) return;
    setPhase("intro");
    recording.reset();
    speak(current.ttsText).then(() => setPhase("ready"));
    return () => cancelTTS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id]);

  function toggleCaptions() {
    setCaptionsOn((prev) => {
      const next = !prev;
      localStorage.setItem(CAPTIONS_KEY, String(next));
      return next;
    });
  }

  async function handleStartRecording() {
    cancelTTS();
    const ok = await recording.startRecording();
    if (ok) {
      setPhase("recording");
      if (captionsOn && stt.supported) stt.start();
    }
  }

  function handleStopRecording() {
    recording.stopRecording();
    if (stt.isListening) stt.stop();
    setPhase("stopped");
  }

  function handleRetake() {
    recording.reset();
    stt.stop();
    setPhase("ready");
  }

  async function handleConfirmAndNext() {
    if (!recording.audioBlob || !current) return;
    setPhase("uploading");
    setSaveError(null);

    const mime = recording.audioBlob.type || "audio/mp4";
    const ext = extFromMime(mime);
    const path = `${userId}/${sessionTempId.current}/${current.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, recording.audioBlob, {
      contentType: mime,
      upsert: false,
    });

    if (uploadError) {
      console.error("[voice-diary] 업로드 실패:", uploadError);
      setSaveError("업로드 중 문제가 발생했습니다. 다시 시도해주세요.");
      setPhase("stopped");
      return;
    }

    const meta: RecordingMeta = {
      questionId: current.id,
      questionText: current.questionText,
      filePath: path,
      durationSeconds: recording.durationSeconds,
    };
    const updated = [...finishedRecordings, meta];
    setFinishedRecordings(updated);

    if (isLast) {
      await finalize(updated);
    } else {
      setIndex((i) => i + 1);
    }
  }

  function handleSkip() {
    if (isLast) {
      finalize(finishedRecordings);
    } else {
      setIndex((i) => i + 1);
    }
  }

  async function finalize(recordings: RecordingMeta[]) {
    if (recordings.length === 0) {
      setSaveError("최소 1개 문항은 녹음해야 저장할 수 있습니다.");
      setPhase("ready");
      return;
    }
    setFinalizing(true);
    const ids = questions.map((q) => q.id);
    const result = await saveSession(ids, recordings);
    setFinalizing(false);

    if ("error" in result) {
      setSaveError(result.error);
      return;
    }
    sessionStorage.removeItem("voice_diary_selected_questions");
    router.push(`/records/${result.sessionId}`);
  }

  const progress = useMemo(
    () => (questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0),
    [index, questions.length]
  );

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-stone-400">불러오는 중...</p>
      </div>
    );
  }

  if (finalizing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="animate-pulse text-4xl mb-4">💾</div>
        <p className="text-stone-600">소중한 이야기를 저장하고 있어요...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-400">
            {index + 1} / {questions.length}
          </span>
          {stt.supported && (
            <button onClick={toggleCaptions} className="text-xs text-stone-400 underline">
              자막 {captionsOn ? "끄기" : "켜기"}
            </button>
          )}
        </div>
        <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-6 gap-6">
        <div className="card text-center">
          <p className="text-xs text-brand-600 font-semibold mb-2">{current.category}</p>
          <p className="text-lg font-bold text-stone-800 leading-relaxed">{current.questionText}</p>
          {phase === "ready" && (
            <p className="text-sm text-stone-400 mt-3">{current.starter}</p>
          )}
          {isSpeaking && <p className="text-xs text-brand-500 mt-3 animate-pulse">질문을 읽어드리고 있어요...</p>}
        </div>

        {phase === "recording" && (
          <div className="flex items-end justify-center gap-1 h-16">
            {recording.levels.map((lvl, i) => (
              <div
                key={i}
                className="w-2 bg-brand-500 rounded-full transition-all"
                style={{ height: `${Math.max(4, lvl * 64)}px` }}
              />
            ))}
          </div>
        )}

        {captionsOn && stt.supported && phase === "recording" && stt.transcript && (
          <div className="card !bg-stone-100 !shadow-none max-h-32 overflow-y-auto">
            <p className="text-sm text-stone-600">{stt.transcript}</p>
          </div>
        )}

        {phase === "stopped" && recording.audioUrl && (
          <div className="card">
            <p className="text-sm text-stone-500 mb-2">녹음을 확인해보세요</p>
            <audio src={recording.audioUrl} controls className="w-full" />
            <p className="text-xs text-stone-400 mt-2">
              녹음 시간: {recording.durationSeconds}초
            </p>
          </div>
        )}

        {recording.error && (
          <p className="text-red-600 text-sm text-center">{recording.error}</p>
        )}
        {saveError && <p className="text-red-600 text-sm text-center">{saveError}</p>}
      </div>

      <div className="px-6 pb-8 space-y-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        {(phase === "ready" || phase === "intro") && (
          <>
            <button onClick={handleStartRecording} className="btn-primary !py-5 text-lg">
              🎙️ 녹음 시작
            </button>
            <button onClick={handleSkip} className="btn-secondary !py-3 text-sm">
              이 문항 건너뛰기
            </button>
          </>
        )}

        {phase === "recording" && (
          <button onClick={handleStopRecording} className="btn-primary !bg-red-600 active:!bg-red-700 !py-5 text-lg">
            ⏹ 녹음 종료
          </button>
        )}

        {(phase === "stopped" || phase === "uploading") && (
          <>
            <button
              onClick={handleConfirmAndNext}
              disabled={phase === "uploading"}
              className="btn-primary !py-5 text-lg"
            >
              {phase === "uploading" ? "저장 중..." : isLast ? "저장하고 마치기" : "저장하고 다음 문항"}
            </button>
            <button onClick={handleRetake} disabled={phase === "uploading"} className="btn-secondary !py-3 text-sm">
              다시 녹음하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
