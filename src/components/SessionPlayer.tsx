"use client";

import { useRef, useState } from "react";
import { useTTS } from "@/hooks/useTTS";
import { getQuestionById } from "@/lib/questions";
import { formatDuration } from "@/lib/dateUtils";

type Item = {
  id: string;
  questionId: number;
  questionText: string;
  durationSeconds: number;
  url: string;
};

type Mode = "individual" | "continuous" | "withQuestion";

export default function SessionPlayer({ items }: { items: Item[] }) {
  const { speak, cancel } = useTTS();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mode, setMode] = useState<Mode>("individual");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const stopFlag = useRef(false);

  function waitForAudioEnd(url: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = audioRef.current;
      if (!audio) return resolve();
      audio.src = url;
      const onEnd = () => {
        audio.removeEventListener("ended", onEnd);
        resolve();
      };
      audio.addEventListener("ended", onEnd);
      audio.play().catch(() => resolve());
    });
  }

  async function playContinuous(withQuestion: boolean) {
    stopFlag.current = false;
    for (let i = 0; i < items.length; i++) {
      if (stopFlag.current) break;
      setPlayingIndex(i);
      if (withQuestion) {
        const q = getQuestionById(items[i].questionId);
        await speak(q?.ttsText ?? items[i].questionText);
        if (stopFlag.current) break;
      }
      await waitForAudioEnd(items[i].url);
    }
    setPlayingIndex(null);
  }

  function handlePlayAll() {
    setMode("continuous");
    playContinuous(false);
  }

  function handlePlayWithQuestion() {
    setMode("withQuestion");
    playContinuous(true);
  }

  function handleStop() {
    stopFlag.current = true;
    cancel();
    audioRef.current?.pause();
    setPlayingIndex(null);
    setMode("individual");
  }

  return (
    <div className="flex-1 flex flex-col">
      <audio ref={audioRef} className="hidden" />

      <div className="px-5 pb-3 grid grid-cols-2 gap-2">
        {playingIndex === null ? (
          <>
            <button onClick={handlePlayAll} className="btn-secondary !py-3 text-sm">
              ▶ 전체 연속 재생
            </button>
            <button onClick={handlePlayWithQuestion} className="btn-secondary !py-3 text-sm">
              🗣 문항+답변 함께 듣기
            </button>
          </>
        ) : (
          <button onClick={handleStop} className="btn-secondary !py-3 text-sm col-span-2 !bg-red-50 !text-red-600 !border-red-200">
            ⏹ 재생 중지
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-3">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`card ${playingIndex === i ? "border-brand-400 bg-brand-50" : ""}`}
          >
            <p className="text-sm font-semibold text-stone-700 mb-2">{item.questionText}</p>
            {item.url ? (
              <audio src={item.url} controls className="w-full" />
            ) : (
              <p className="text-xs text-red-500">재생 링크를 불러올 수 없습니다.</p>
            )}
            <p className="text-xs text-stone-400 mt-2">{formatDuration(item.durationSeconds)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}