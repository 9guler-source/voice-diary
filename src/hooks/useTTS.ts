'use client'

import { useCallback, useEffect, useRef } from 'react'
import { playChime, stopChime } from '@/lib/chime'

export function useTTS() {
  const isSpeakingRef = useRef(false)
  const callIdRef = useRef(0)

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
      stopChime()
      window.speechSynthesis?.cancel()
      isSpeakingRef.current = false
    }
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined') return
    ++callIdRef.current
    isSpeakingRef.current = false
    stopChime()
    window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback((text: string, volume: number = 80): Promise<void> => {
    // 기존 TTS + 차임 즉시 중단
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel()
    }
    stopChime()
    isSpeakingRef.current = false
    const callId = ++callIdRef.current

    return (async () => {
      if (typeof window === 'undefined') return

      // 멜로디 선행 재생 → 이전 잔여음 마스킹 (1.25초)
      await playChime(volume)

      // 차임 재생 중 취소됐으면 중단
      if (callId !== callIdRef.current) return

      await new Promise<void>((resolve) => {
        const utt = new SpeechSynthesisUtterance(text)
        utt.lang = 'ko-KR'
        utt.rate = 0.85
        utt.volume = volume / 100
        utt.onend = () => { isSpeakingRef.current = false; resolve() }
        utt.onerror = () => { isSpeakingRef.current = false; resolve() }
        isSpeakingRef.current = true
        window.speechSynthesis.speak(utt)
      })
    })()
  }, [])

  return { speak, stop }
}
