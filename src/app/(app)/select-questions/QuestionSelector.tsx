"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ALL_QUESTIONS, CATEGORIES, FINAL_QUESTION } from "@/lib/questions";

const MAX_SELECT = 30;
const FAVORITES_KEY = "voice_diary_favorites";

export default function QuestionSelector({ defaultSelectedIds }: { defaultSelectedIds: number[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>(
    defaultSelectedIds.length > 0 ? defaultSelectedIds : []
  );
  const [openCategory, setOpenCategory] = useState<string | null>(CATEGORIES[0] ?? null);
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      // 무시
    }
  }, []);

  function toggleFavorite(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggle(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, id];
    });
  }

  const grouped = useMemo(() => {
    const map: Record<string, typeof ALL_QUESTIONS> = {};
    for (const cat of CATEGORIES) {
      map[cat] = ALL_QUESTIONS.filter((q) => q.category === cat);
    }
    return map;
  }, []);

  function handleStart() {
    if (selected.length === 0) return;
    // 선택 순서가 아니라 문항 정의 순서(id)로 정렬하여 자연스러운 진행 순서 보장
    const ordered = [...selected].sort((a, b) => a - b);
    sessionStorage.setItem("voice_diary_selected_questions", JSON.stringify(ordered));
    router.push("/session");
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-6 pb-3 sticky top-0 bg-stone-50 z-10 border-b border-stone-200">
        <h1 className="text-lg font-bold text-stone-800">오늘 이야기할 문항을 골라주세요</h1>
        <p className="text-sm text-stone-500 mt-1">
          최소 1개, 최대 30개까지 자유롭게 선택할 수 있어요 ({selected.length}/{MAX_SELECT})
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 pb-28">
        {/* 자유 이야기 항목 - 강제 아님, 일반 문항처럼 선택 */}
        <QuestionRow
          q={FINAL_QUESTION}
          checked={selected.includes(FINAL_QUESTION.id)}
          isFavorite={favorites.includes(FINAL_QUESTION.id)}
          onToggle={() => toggle(FINAL_QUESTION.id)}
          onFavorite={(e) => toggleFavorite(FINAL_QUESTION.id, e)}
          highlight
        />

        {CATEGORIES.map((cat) => {
          const items = grouped[cat];
          const selectedInCat = items.filter((q) => selected.includes(q.id)).length;
          const isOpen = openCategory === cat;
          return (
            <div key={cat} className="card !p-0 overflow-hidden">
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-stone-50"
              >
                <span className="font-semibold text-stone-700">{cat}</span>
                <span className="text-xs text-stone-400">
                  {selectedInCat > 0 ? `${selectedInCat}개 선택됨` : ""} {isOpen ? "▲" : "▼"}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-stone-100 divide-y divide-stone-100">
                  {items.map((q) => (
                    <QuestionRow
                      key={q.id}
                      q={q}
                      checked={selected.includes(q.id)}
                      isFavorite={favorites.includes(q.id)}
                      onToggle={() => toggle(q.id)}
                      onFavorite={(e) => toggleFavorite(q.id, e)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="sticky bottom-0 bg-stone-50 px-5 pt-3 border-t border-stone-200"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <button onClick={handleStart} disabled={selected.length === 0} className="btn-primary">
          {selected.length === 0 ? "문항을 선택해주세요" : `${selected.length}개 문항으로 시작하기`}
        </button>
      </div>
    </div>
  );
}

function QuestionRow({
  q,
  checked,
  isFavorite,
  onToggle,
  onFavorite,
  highlight,
}: {
  q: { id: number; questionText: string };
  checked: boolean;
  isFavorite: boolean;
  onToggle: () => void;
  onFavorite: (e: React.MouseEvent) => void;
  highlight?: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
        highlight ? "card border-brand-300 bg-brand-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-5 h-5 accent-brand-600 shrink-0"
      />
      <span className="flex-1 text-sm text-stone-700">{q.questionText}</span>
      <button onClick={onFavorite} className="text-lg shrink-0" aria-label="즐겨찾기">
        {isFavorite ? "⭐" : "☆"}
      </button>
    </div>
  );
}
