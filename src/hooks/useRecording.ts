"use client";

import { useCallback, useRef, useState } from "react";

// iOS Safari는 audio/webm을 지원하지 않음 (10장 원인 분석).
// 우선순위: iOS가 실제로 지원하는 mp4/aac 계열을 먼저 시도하고,
// 데스크톱 Chrome 등에서는 webm/opus로 자연스럽게 폴백됨.
const MIME_CANDIDATES = [
  "audio/mp4",
  "audio/aac",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/webm;codecs=opus",
  "audio/webm",
];

function getSupportedMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
  for (const type of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // isTypeSupported 자체가 없는 매우 구형 브라우저 - 무시하고 다음 후보로
    }
  }
  return ""; // 빈 문자열이면 브라우저 기본값 사용 (마지막 폴백)
}

export type RecordingState = "idle" | "requesting" | "recording" | "stopped" | "error";

export function useRecording() {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(new Array(24).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const cleanupStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const visualize = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (!analyserRef.current) return;
      analyser.getByteFrequencyData(data);
      const bucketCount = 24;
      const bucketSize = Math.floor(data.length / bucketCount) || 1;
      const next: number[] = [];
      for (let i = 0; i < bucketCount; i++) {
        let sum = 0;
        for (let j = 0; j < bucketSize; j++) sum += data[i * bucketSize + j] || 0;
        // 10% 축소: 모바일 화면에서 과도하게 튀는 것을 완화 (4장 참조)
        const value = Math.min(1, sum / bucketSize / 255) * 0.9;
        next.push(value);
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setDurationSeconds(0);
    chunksRef.current = [];
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 파형 시각화용 AnalyserNode
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AC();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        visualize();
      } catch (vizErr) {
        console.warn("[voice-diary] 파형 시각화 초기화 실패 (녹음 자체에는 영향 없음):", vizErr);
      }

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      console.log("[voice-diary] 선택된 mimeType:", mimeType || "(브라우저 기본값)");

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        console.log("[voice-diary] ondataavailable, size:", e.data?.size ?? 0);
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e: Event) => {
        console.error("[voice-diary] MediaRecorder onerror:", e);
        setError("녹음 중 오류가 발생했습니다. 다시 시도해주세요.");
        setState("error");
        cleanupStream();
      };

      recorder.onstop = () => {
        const finalMime = mimeTypeRef.current || recorder.mimeType || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        console.log("[voice-diary] 녹음 종료, 총 blob size:", blob.size, "type:", finalMime);

        if (blob.size === 0) {
          // 10장 핵심 이슈: iOS에서 파형은 보이지만 실제 데이터가 0바이트인 경우 명시적 안내
          setError(
            "녹음 파일이 저장되지 않았습니다. 마이크 권한을 확인하시고, 화면을 켠 상태로 다시 한번 녹음해주세요."
          );
          setState("error");
          cleanupStream();
          return;
        }

        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setDurationSeconds(Math.round((Date.now() - startTimeRef.current) / 1000));
        setState("stopped");
        cleanupStream();
      };

      // iOS Safari는 timeslice 없이 호출 시 dataavailable이 stop 시 1회만 발생하기도 함.
      // 1초 단위로 청크를 받아 0바이트 누락 가능성을 줄임.
      recorder.start(1000);
      startTimeRef.current = Date.now();
      setState("recording");
      return true;
    } catch (err: any) {
      console.error("[voice-diary] getUserMedia/MediaRecorder 생성 실패:", err);
      let msg = "마이크에 접근할 수 없습니다. 설정에서 마이크 권한을 확인해주세요.";
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        msg = "마이크 권한이 거부되었습니다. 휴대폰 설정 > 브라우저 > 마이크 권한을 허용해주세요.";
      } else if (err?.name === "NotFoundError") {
        msg = "마이크를 찾을 수 없습니다. 기기에 마이크가 연결되어 있는지 확인해주세요.";
      }
      setError(msg);
      setState("error");
      cleanupStream();
      return false;
    }
  }, [cleanupStream, visualize]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setDurationSeconds(0);
    setLevels(new Array(24).fill(0));
    chunksRef.current = [];
  }, []);

  return {
    state,
    error,
    audioBlob,
    audioUrl,
    durationSeconds,
    levels,
    startRecording,
    stopRecording,
    reset,
  };
}
