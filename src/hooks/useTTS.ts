'use client'

import { useCallback, useEffect, useRef } from 'react'

export function useTTS() {
  const synthRef = useRef<SpeechSynthesis | null>(null)
  // 현재 재생 중인 utterance 추적 — 이전 utterance가 새 문항에서 재생되는 것을 방지
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
    }
    return () => {
      cancelAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cancelAll = useCallback(() => {
    const synth = synthRef.current
    if (!synth) return
    // Chrome: pause() 후 cancel() 해야 즉시 중단됨 (cancel() 단독으로는 async)
    synth.pause()
    synth.cancel()
    uttRef.current = null
  }, [])

  const speak = useCallback((text: string, volume: number = 80) => {
    const synth = synthRef.current
    if (!synth) return

    synth.pause()
    synth.cancel()
    uttRef.current = null

    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'ko-KR'
    utt.rate = 0.85
    utt.volume = volume / 100
    utt.onend = () => {
      if (uttRef.current === utt) uttRef.current = null
    }
    uttRef.current = utt
    synth.speak(utt)
  }, [])

  const stop = useCallback(() => {
    cancelAll()
  }, [cancelAll])

  return { speak, stop }
}
