type Props = {
  transcript: string
  interim?: string
  visible: boolean
}

export default function CaptionBox({ transcript, interim, visible }: Props) {
  if (!visible) return null

  return (
    <div className="bg-deep/80 text-warm-white rounded-xl px-4 py-3 text-sm leading-relaxed min-h-[80px] max-h-40 overflow-y-auto">
      <span>{transcript}</span>
      {interim && <em className="opacity-60"> {interim}</em>}
      {!transcript && !interim && (
        <span className="opacity-40">음성을 인식 중입니다...</span>
      )}
    </div>
  )
}
