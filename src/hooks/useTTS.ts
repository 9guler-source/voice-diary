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

      const finish = () => {
        // callId가 바뀌었다면(새 발화가 시작됐다면) 이 콜백은 무시 - stale utterance 방지
        if (callIdRef.current === myCallId) setIsSpeaking(false);
        resolve();
      };

      utter.onend = finish;
      utter.onerror = finish;

      // cancel() 직후 바로 speak()를 호출하면 일부 브라우저(특히 iOS Safari)에서
      // 새 발화가 씹히는 현상이 있어 짧은 지연 후 호출 (9장 시도 #3~7 종합)
      setTimeout(() => {
        if (callIdRef.current !== myCallId) {
          resolve();
          return;
        }
        setIsSpeaking(true);
        window.speechSynthesis.speak(utter);
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
