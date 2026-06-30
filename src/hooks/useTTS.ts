'use client'

import { useCallback, useEffect, useRef } from 'react'

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
      window.speechSynthesis?.cancel()
      isSpeakingRef.current = false
    }
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined') return
    ++callIdRef.current
    isSpeakingRef.current = false
    window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback((text: string, volume: number = 80): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve()

    window.speechSynthesis.cancel()
    isSpeakingRef.current = false
    const callId = ++callIdRef.current

    return new Promise<void>((resolve) => {
      if (callId !== callIdRef.current) { resolve(); return }

      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'ko-KR'
      utt.rate = 0.85
      utt.volume = volume / 100
      utt.onend = () => { isSpeakingRef.current = false; resolve() }
      utt.onerror = () => { isSpeakingRef.current = false; resolve() }
      isSpeakingRef.current = true
      window.speechSynthesis.speak(utt)
    })
  }, [])

  return { speak, stop }
}
