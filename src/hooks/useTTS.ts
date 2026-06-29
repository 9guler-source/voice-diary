'use client'

import { useCallback, useEffect, useRef } from 'react'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function useTTS() {
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const callIdRef = useRef(0)
  const isSpeakingRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
    }

    // Chrome 15초 멈춤 버그 우회: 5초마다 resume() 호출
    const interval = setInterval(() => {
      if (isSpeakingRef.current && synthRef.current) {
        synthRef.current.resume()
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      callIdRef.current++
      const synth = synthRef.current
      if (synth) {
        synth.pause()
        synth.cancel()
      }
      isSpeakingRef.current = false
    }
  }, [])

  const stop = useCallback(() => {
    callIdRef.current++
    const synth = synthRef.current
    if (!synth) return
    synth.pause()
    synth.cancel()
    isSpeakingRef.current = false
  }, [])

  const speak = useCallback(async (text: string, volume: number = 80) => {
    const synth = synthRef.current
    if (!synth) return

    // 이 speak() 호출의 고유 ID — 더 늦은 speak()/stop() 호출이 오면 무효화됨
    const myCallId = ++callIdRef.current

    // 1단계: 즉시 중단
    synth.pause()
    synth.cancel()
    isSpeakingRef.current = false

    // 2단계: 300ms 대기 (브라우저가 cancel 처리할 시간)
    await sleep(300)
    if (callIdRef.current !== myCallId) return

    // 3단계: 한 번 더 cancel
    synth.cancel()

    // 4단계: 100ms 추가 대기
    await sleep(100)
    if (callIdRef.current !== myCallId) return

    // 5단계: 새 utterance 생성 및 재생
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'ko-KR'
    utt.rate = 0.85
    utt.volume = volume / 100

    utt.onstart = () => {
      if (callIdRef.current !== myCallId) {
        // 이미 다음 speak()/stop()이 왔으면 즉시 중단
        synth.pause()
        synth.cancel()
      } else {
        isSpeakingRef.current = true
      }
    }

    // 단어/문장 경계마다 재검사 (onstart 이후 이동 대비)
    utt.onboundary = () => {
      if (callIdRef.current !== myCallId) {
        synth.pause()
        synth.cancel()
      }
    }

    utt.onend = () => {
      if (callIdRef.current === myCallId) {
        isSpeakingRef.current = false
      }
    }

    utt.onerror = () => {
      if (callIdRef.current === myCallId) {
        isSpeakingRef.current = false
      }
    }

    synth.speak(utt)
  }, [])

  return { speak, stop }
}
