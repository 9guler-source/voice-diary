type Props = {
  order: number
  total: number
  category: string
  content: string
  isFreeTalk?: boolean
}

export default function QuestionCard({ order, total, category, content, isFreeTalk }: Props) {
  return (
    <div className={`rounded-2xl p-5 ${isFreeTalk ? 'bg-amber/10 border border-amber/30' : 'bg-warm-white border border-muted/20'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isFreeTalk ? 'bg-amber text-white' : 'bg-muted/20 text-mid'}`}>
          {isFreeTalk ? '자유 이야기' : category}
        </span>
        <span className="text-xs text-muted">{order} / {total}</span>
      </div>
      <p className="text-deep font-medium text-lg leading-snug">{content}</p>
    </div>
  )
}
