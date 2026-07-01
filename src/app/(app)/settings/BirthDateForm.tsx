"use client";

import { useState, useTransition } from "react";
import { updateMyBirthDate } from "./actions";
import { parseBirthDate, formatBirthDateKo } from "@/lib/birthDate";

export default function BirthDateForm({ currentBirthDate }: { currentBirthDate: string | null }) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed = parseBirthDate(input);
    if (!parsed) {
      setMessage({ type: "error", text: "올바른 형식으로 입력해주세요. 예: 19510208" });
      return;
    }
    startTransition(async () => {
      const result = await updateMyBirthDate(parsed);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `${formatBirthDateKo(input)}으로 저장되었습니다.` });
        setInput("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        placeholder={currentBirthDate ? "변경할 생년월일 (예: 19510208)" : "생년월일 입력 (예: 19510208)"}
        value={input}
        onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
        className="input-field !py-2 text-sm"
        inputMode="numeric"
        maxLength={8}
      />
      {message && (
        <p className={`text-xs ${message.type === "error" ? "text-red-500" : "text-green-600"}`}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={isPending || input.length < 8} className="btn-secondary !py-2 text-sm">
        {isPending ? "저장 중..." : currentBirthDate ? "생년월일 변경" : "생년월일 저장"}
      </button>
    </form>
  );
}
