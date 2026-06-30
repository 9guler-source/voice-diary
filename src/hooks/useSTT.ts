"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function useSTT() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    // iOS Safari는 SpeechRecognition 마이크 스트림 충돌로 사실상 동작하지 않음 (8.2 참조).
    // 명세상 "iOS STT 비활성화 + 안내 메시지" 로드맵을 즉시 반영하여 UI에서 자막 토글을 숨김.
    if (!SR || isIOS()) {
      setSupported(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (e: any) => {
      console.warn("[voice-diary] STT 오류:", e?.error);
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setSupported(false);
      }
    };

    recognition.onend = () => {
      // PC Chrome은 일정 시간 후 자동 종료되므로, 사용자가 멈추지 않았다면 재시작
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (err) {
          console.warn("[voice-diary] STT 재시작 실패:", err);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      try {
        recognition.stop();
      } catch {
        // 무시
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    setTranscript("");
    shouldRestartRef.current = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.warn("[voice-diary] STT 시작 실패:", err);
    }
  }, [supported]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // 무시
      }
    }
    setIsListening(false);
  }, []);

  return { transcript, isListening, supported, start, stop };
}
