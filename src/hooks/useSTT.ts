'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionResultItem {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionResultItem
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface STTEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: STTEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

export function useSTT() {
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  // true: 녹음 중 dropout 시 자동 재시작 허용 / false: 의도적 stop 이후 재시작 금지
  const shouldRestartRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRec) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다.')
      return
    }

    const rec = new SpeechRec()
    rec.lang = 'ko-KR'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e: STTEvent) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }
      if (finalText) setTranscript((prev) => prev + finalText)
      setInterim(interimText)
    }

    rec.onerror = (e: { error: string }) => {
      if (e.error === 'not-allowed') {
        setError('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해 주세요.')
        shouldRestartRef.current = false
      } else if (e.error === 'aborted') {
        // stop() 호출로 인한 중단 — 재시작 불필요
        shouldRestartRef.current = false
      }
      // 'no-speech', 'network' 등은 shouldRestart 그대로 유지 → onend에서 재시작
      setListening(false)
    }

    rec.onend = () => {
      setListening(false)
      setInterim('')
      if (shouldRestartRef.current && recognitionRef.current) {
        // 드롭아웃 복구: 300ms 후 재시작 (즉시 재시작 시 InvalidStateError 방지)
        setTimeout(() => {
          if (shouldRestartRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start()
              setListening(true)
            } catch {
              // 이미 실행 중이거나 권한 없음 — 무시
            }
          }
        }, 300)
      }
    }

    recognitionRef.current = rec
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setTranscript('')
    setInterim('')
    setError('')
    shouldRestartRef.current = true
    recognitionRef.current.start()
    setListening(true)
  }, [])

  const stop = useCallback(() => {
    shouldRestartRef.current = false  // 의도적 중단 — onend에서 재시작 금지
    recognitionRef.current?.stop()
    setListening(false)
    setInterim('')
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
  }, [])

  return { transcript, interim, listening, error, start, stop, reset }
}
