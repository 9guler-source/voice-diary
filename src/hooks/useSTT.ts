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
      }
      setListening(false)
    }

    rec.onend = () => setListening(false)
    recognitionRef.current = rec
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setTranscript('')
    setInterim('')
    setError('')
    recognitionRef.current.start()
    setListening(true)
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
    setInterim('')
  }, [])

  return { transcript, interim, listening, error, start, stop }
}
