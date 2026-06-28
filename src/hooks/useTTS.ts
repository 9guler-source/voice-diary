'use client'

import { useCallback, useEffect, useRef } from 'react'

export function useTTS() {
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
    }
    return () => { synthRef.current?.cancel() }
  }, [])

  const speak = useCallback((text: string, volume: number = 80) => {
    if (!synthRef.current) return
    synthRef.current.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'ko-KR'
    utt.rate = 0.85
    utt.volume = volume / 100
    synthRef.current.speak(utt)
  }, [])

  const stop = useCallback(() => {
    synthRef.current?.cancel()
  }, [])

  return { speak, stop }
}
