"use client";

import { useEffect, useState } from "react";
import { ALL_QUESTIONS } from "@/lib/questions";

const FAVORITES_KEY = "voice_diary_favorites";

export default function FavoritesManager() {
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      // 무시
    }
  }, []);

  function removeFavorite(id: number) {
    const next = favorites.filter((f) => f !== id);
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  const favoriteQuestions = ALL_QUESTIONS.filter((q) => favorites.includes(q.id));

  if (favoriteQuestions.length === 0) {
    return (
      <p className="text-sm text-stone-400">
        아직 즐겨찾기한 문항이 없어요. 문항 선택 화면에서 ☆ 버튼을 눌러 추가해보세요.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {favoriteQuestions.map((q) => (
        <li key={q.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
          <span className="text-sm text-stone-700">{q.questionText}</span>
          <button onClick={() => removeFavorite(q.id)} className="text-xs text-red-500 shrink-0 ml-2">
            제거
          </button>
        </li>
      ))}
    </ul>
  );
}
