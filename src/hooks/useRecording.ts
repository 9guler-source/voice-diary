'use client'

import { useCallback, useRef, useState } from 'react'

export type RecordingResult = {
  blob: Blob
  durationSec: number
  maxDecibel: number
  avgDecibel: number
}

export function useRecording() {
  const [recording, setRecording] = useState(false)
  const [decibel, setDecibel] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const decibelHistoryRef = useRef<number[]>([])

  const getDecibel = useCallback((analyser: AnalyserNode): number => {
    const data = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128
      sum += normalized * normalized
    }
    const rms = Math.sqrt(sum / data.length)
    return rms > 0 ? 20 * Math.log10(rms) + 90 : 0
  }, [])

  const start = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      decibelHistoryRef.current = []

      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(100)
      mediaRecorderRef.current = mr
      startTimeRef.current = Date.now()
      setRecording(true)

      const tick = () => {
        const db = getDecibel(analyser)
        setDecibel(db)
        decibelHistoryRef.current.push(db)
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      throw new Error('마이크 접근 권한이 필요합니다.')
    }
  }, [getDecibel])

  const stop = useCallback((): Promise<RecordingResult> => {
    return new Promise((resolve) => {
      cancelAnimationFrame(animFrameRef.current)
      const mr = mediaRecorderRef.current
      if (!mr) return

      const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000)
      const history = decibelHistoryRef.current
      const maxDecibel = history.length ? Math.max(...history) : 0
      const avgDecibel = history.length ? history.reduce((a, b) => a + b, 0) / history.length : 0

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        mr.stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        setDecibel(0)
        resolve({ blob, durationSec, maxDecibel, avgDecibel })
      }
      mr.stop()
    })
  }, [])

  return { recording, decibel, start, stop }
}
