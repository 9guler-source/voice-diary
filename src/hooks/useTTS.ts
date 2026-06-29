'use client'

import { useCallback, useEffect, useRef } from 'react'

export function useTTS() {
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null)

  /**
   * 현재 재생이 허용된 문항 인덱스.
   * stop() / cancelNow() 시 -1로 초기화되어
   * 이미 큐에 들어간 utterance가 onstart/onboundary에서 자신을 취소함.
   */
  const expectedIdxRef = useRef<number>(-1)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
    }
    return () => { cancelNow() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Chrome 비동기 cancel 버그 대응: pause() 먼저 → cancel() */
  const cancelNow = useCallback(() => {
    const synth = synthRef.current
    if (!synth) return
    expectedIdxRef.current = -1   // 모든 기존 utterance 무효화
    synth.pause()
    synth.cancel()
    uttRef.current = null
  }, [])

  /**
   * @param text       읽을 텍스트
   * @param questionIdx 현재 문항 인덱스 (onstart/onboundary 감시용)
   * @param volume     0~100
   *
   * Chrome 우회 전략:
   * 1. expectedIdxRef를 questionIdx로 업데이트
   * 2. pause()+cancel()로 기존 TTS 즉시 중단 시도
   * 3. 새 utterance의 onstart/onboundary에서
   *    "캡처된 idx === expectedIdxRef.current" 검사
   *    → 불일치(사용자가 이미 다음 문항으로 이동)이면 즉시 pause()+cancel()
   * 이 방식으로 Chrome async cancel race condition을 완전히 차단
   */
  const speak = useCallback((text: string, questionIdx: number, volume: number = 80) => {
    const synth = synthRef.current
    if (!synth) return

    // 이 문항만 재생 허용
    expectedIdxRef.current = questionIdx
    synth.pause()
    synth.cancel()
    uttRef.current = null

    const thisIdx = questionIdx  // 클로저에 캡처

    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'ko-KR'
    utt.rate = 0.85
    utt.volume = volume / 100

    // ── Chrome 핵심 가드 ──────────────────────────────────
    // onstart: 오디오 출력이 시작되는 순간 인덱스 검사
    utt.onstart = () => {
      if (expectedIdxRef.current !== thisIdx) {
        synth.pause()
        synth.cancel()
        uttRef.current = null
      }
    }

    // onboundary: 단어/문장 경계마다 재검사 (onstart 후에도 이동했을 경우 대비)
    utt.onboundary = () => {
      if (expectedIdxRef.current !== thisIdx) {
        synth.pause()
        synth.cancel()
        uttRef.current = null
      }
    }
    // ──────────────────────────────────────────────────────

    utt.onend = () => {
      if (uttRef.current === utt) uttRef.current = null
    }

    uttRef.current = utt
    synth.speak(utt)
  }, [])

  const stop = useCallback(() => {
    cancelNow()
  }, [cancelNow])

  return { speak, stop }
}
