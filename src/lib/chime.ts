let currentCtx: AudioContext | null = null

export function stopChime() {
  if (currentCtx) {
    currentCtx.close()
    currentCtx = null
  }
}

export function playChime(volume: number = 80): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return }

    stopChime()

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    currentCtx = ctx

    // C5-E5-G5-E5-C5 밝고 따뜻한 5음 멜로디
    const notes = [
      { freq: 523.25, start: 0.0,  dur: 0.22 },
      { freq: 659.25, start: 0.22, dur: 0.22 },
      { freq: 783.99, start: 0.44, dur: 0.22 },
      { freq: 659.25, start: 0.66, dur: 0.22 },
      { freq: 523.25, start: 0.88, dur: 0.30 },
    ]

    const vol = (volume / 100) * 0.2

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq

      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur + 0.05)
    })

    setTimeout(() => {
      resolve()
    }, 1250)
  })
}
