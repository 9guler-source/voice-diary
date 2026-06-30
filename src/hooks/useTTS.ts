"use client";

import { useCallback, useRef, useState } from "react";

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const callIdRef = useRef(0);

  const speak = useCallback((text: string, rate = 0.85): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      const myCallId = ++callIdRef.current;
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ko-KR";
      utter.rate = rate;

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        // callId가 바뀌었다면(새 발화가 시작됐다면) 이 콜백은 무시 - stale utterance 방지
        if (callIdRef.current === myCallId) setIsSpeaking(false);
        resolve();
      };

      utter.onend = finish;
      utter.onerror = finish;

      // 안전장치: Chrome 등 일부 브라우저는 onend/onerror가 끝내 발생하지 않는
      // 버그가 있어, 텍스트 길이 기반 예상 시간 + 여유분이 지나면 강제로 다음 단계로 진행.
      // (이 버그로 인해 "녹음 시작" 버튼이 영원히 비활성화되는 문제가 있었음)
      const estimatedMs = Math.max(3000, text.length * 220);
      let safetyTimer: ReturnType<typeof setTimeout> | null = setTimeout(finish, estimatedMs);

      // cancel() 직후 바로 speak()를 호출하면 일부 브라우저(특히 iOS Safari)에서
      // 새 발화가 씹히는 현상이 있어 짧은 지연 후 호출 (9장 시도 #3~7 종합)
      setTimeout(() => {
        if (callIdRef.current !== myCallId) {
          if (safetyTimer) clearTimeout(safetyTimer);
          resolve();
          return;
        }
        setIsSpeaking(true);
        try {
          window.speechSynthesis.speak(utter);
        } catch (err) {
          console.warn("[voice-diary] speechSynthesis.speak 실패:", err);
          finish();
        }
      }, 50);
    });
  }, []);

  const cancel = useCallback(() => {
    callIdRef.current++; // 진행 중이던 발화를 stale 처리
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking };
}
