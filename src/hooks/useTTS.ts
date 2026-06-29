'use client'

import { useCallback, useEffect, useRef } from 'react'

export function useTTS() {
  const isSpeakingRef = useRef(false)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Chrome 15초 멈춤 버그 우회: 5초마다 resume() 호출
    const interval = setInterval(() => {
      if (isSpeakingRef.current) {
        window.speechSynthesis.resume()
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current)
        pendingTimerRef.current = null
      }
      window.speechSynthesis?.cancel()
      isSpeakingRef.current = false
    }
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined') return
    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current)
      pendingTimerRef.current = null
    }
    isSpeakingRef.current = false
    window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback((text: string, volume: number = 80): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined') { resolve(); return }

      // 대기 중인 타이머 취소 + 현재 재생 중단
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current)
        pendingTimerRef.current = null
      }
      window.speechSynthesis.cancel()
      isSpeakingRef.current = false

      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'ko-KR'
      utt.rate = 0.85
      utt.volume = volume / 100
      utt.onend = () => { isSpeakingRef.current = false; resolve() }
      utt.onerror = () => { isSpeakingRef.current = false; resolve() }

      // cancel() 후 500ms 대기 보장 → 브라우저(Safari 포함)가 큐를 비울 시간 확보
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null
        isSpeakingRef.current = true
        window.speechSynthesis.speak(utt)
      }, 500)
    })
  }, [])

  return { speak, stop }
}
