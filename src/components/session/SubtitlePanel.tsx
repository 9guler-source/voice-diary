'use client'

import Toggle from '@/components/ui/Toggle'
import CaptionBox from '@/components/ui/CaptionBox'

type Props = {
  transcript: string
  interim: string
  sttEnabled: boolean
  onToggleSTT: (v: boolean) => void
  sttError?: string
}

export default function SubtitlePanel({ transcript, interim, sttEnabled, onToggleSTT, sttError }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-mid">자막 (STT)</span>
        <Toggle checked={sttEnabled} onChange={onToggleSTT} />
      </div>
      {sttError && <p className="text-xs text-red-500">{sttError}</p>}
      {sttEnabled && (
        <CaptionBox
          transcript={transcript}
          interim={interim}
          visible={sttEnabled}
        />
      )}
    </div>
  )
}
