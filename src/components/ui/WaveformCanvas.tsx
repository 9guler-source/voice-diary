'use client'

import { useEffect, useRef } from 'react'

type Props = {
  decibel: number
  active: boolean
  info?: string
}

export default function WaveformCanvas({ decibel, active, info }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<number[]>(new Array(60).fill(0))

  useEffect(() => {
    if (active) {
      historyRef.current.push(Math.max(0, Math.min(decibel, 90)))
      historyRef.current.shift()
    } else {
      historyRef.current = new Array(60).fill(0)
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const barW = width / historyRef.current.length
    historyRef.current.forEach((db, i) => {
      const barH = (db / 90) * height * 0.8
      const x = i * barW
      const y = (height - barH) / 2
      ctx.fillStyle = active ? '#E8A840' : '#B8A48A'
      ctx.beginPath()
      ctx.roundRect(x + 1, y, barW - 2, barH || 2, 1)
      ctx.fill()
    })
  }, [decibel, active])

  return (
    <div style={{ padding: '4px 8px' }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={8}
        className="w-full rounded"
      />
      {info && (
        <p className="text-center text-muted mt-0.5" style={{ fontSize: 11 }}>
          {info}
        </p>
      )}
    </div>
  )
}
