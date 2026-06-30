let sharedCtx: AudioContext | null = null

export function initChime() {
  if (typeof window === 'undefined') return
  if (!sharedCtx) {
    sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume()
  }
}

// useTTS에서 호출하지만 shared ctx는 유지
export function stopChime() {}

export function playChime(volume: number = 80): Promise<void> {
  return new Promise(async (resolve) => {
    if (typeof window === 'undefined') { resolve(); return }

    if (!sharedCtx) {
      sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (sharedCtx.state === 'suspended') {
      await sharedCtx.resume()
    }

    const ctx = sharedCtx
    const now = ctx.currentTime
    const vol = (volume / 100) * 0.25

    // C5-E5-G5-E5-C5
    const notes = [
      { freq: 523.25, start: 0.0,  dur: 0.22 },
      { freq: 659.25, start: 0.25, dur: 0.22 },
      { freq: 783.99, start: 0.50, dur: 0.22 },
      { freq: 659.25, start: 0.75, dur: 0.22 },
      { freq: 523.25, start: 1.00, dur: 0.35 },
    ]

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur + 0.1)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.15)
    })

    setTimeout(() => resolve(), 1400)
  })
}
