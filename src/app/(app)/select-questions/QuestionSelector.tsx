'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSelections } from './actions'

interface Question {
  id: number
  category: string
  content: string
}

const QUESTIONS: Question[] = [
  { id: 1,  category: '출생·고향',   content: '태어난 곳은 어디인가요?' },
  { id: 2,  category: '출생·고향',   content: '자라난 동네 이름과 그곳의 기억을 이야기해 주세요.' },
  { id: 3,  category: '출생·고향',   content: '어린 시절 살던 집을 묘사해 주세요.' },
  { id: 4,  category: '출생·고향',   content: '고향에서 가장 좋아하던 장소는 어디인가요?' },
  { id: 5,  category: '출생·고향',   content: '어린 시절 집 근처에 어떤 가게나 장소가 있었나요?' },
  { id: 6,  category: '출생·고향',   content: '고향의 계절 풍경 중 가장 기억에 남는 것은?' },
  { id: 7,  category: '출생·고향',   content: '고향 사투리나 독특한 표현이 있었나요?' },
  { id: 8,  category: '출생·고향',   content: '처음으로 고향을 떠났을 때의 기억은?' },
  { id: 9,  category: '학창시절',    content: '다니던 초등학교 이름은 무엇인가요?' },
  { id: 10, category: '학창시절',    content: '가장 좋아했던 선생님은 누구였나요?' },
  { id: 11, category: '학창시절',    content: '학창시절 가장 친했던 친구 이름은?' },
  { id: 12, category: '학창시절',    content: '학교에서 가장 잘했던 과목은 무엇인가요?' },
  { id: 13, category: '학창시절',    content: '학교 운동회나 소풍에서의 특별한 기억은?' },
  { id: 14, category: '학창시절',    content: '중학교 또는 고등학교 때 열심히 했던 것은?' },
  { id: 15, category: '학창시절',    content: '학창시절 받은 선물 중 가장 기억에 남는 것은?' },
  { id: 16, category: '학창시절',    content: '졸업식 날의 기억을 이야기해 주세요.' },
  { id: 17, category: '학창시절',    content: '학교 시험이나 발표에서 기억에 남는 순간은?' },
  { id: 18, category: '가족·부모님', content: '어머니의 목소리나 말투가 기억나시나요?' },
  { id: 19, category: '가족·부모님', content: '아버지에 대한 가장 오래된 기억은?' },
  { id: 20, category: '가족·부모님', content: '형제자매는 몇 명이고 각자 어떤 사람이었나요?' },
  { id: 21, category: '가족·부모님', content: '명절에 온 가족이 모여 하던 일은?' },
  { id: 22, category: '가족·부모님', content: '부모님께 가장 혼났던 기억이 있다면?' },
  { id: 23, category: '가족·부모님', content: '부모님이 자주 하시던 말씀이나 가르침은?' },
  { id: 24, category: '가족·부모님', content: '어린 시절 가족이 함께한 가장 즐거운 기억은?' },
  { id: 25, category: '가족·부모님', content: '형제자매와 함께했던 장난이나 추억은?' },
  { id: 26, category: '가족·부모님', content: '할머니나 할아버지와의 기억이 있다면?' },
  { id: 27, category: '음식·추억',   content: '어린 시절 가장 좋아하던 음식은 무엇이었나요?' },
  { id: 28, category: '음식·추억',   content: '어머니가 해주시던 음식 중 가장 그리운 것은?' },
  { id: 29, category: '음식·추억',   content: '어릴 때 즐겨 부르던 노래나 동요는?' },
  { id: 30, category: '음식·추억',   content: '어린 시절 즐겨 하던 놀이는 무엇인가요?' },
  { id: 31, category: '음식·추억',   content: '처음으로 먹어본 특별한 음식의 기억은?' },
  { id: 32, category: '음식·추억',   content: '가장 기억에 남는 생일잔치는 언제였나요?' },
  { id: 33, category: '음식·추억',   content: '어릴 때 즐겨 읽던 책이나 만화가 있었나요?' },
  { id: 34, category: '음식·추억',   content: '어린 시절 가장 갖고 싶었던 물건은?' },
  { id: 35, category: '음식·추억',   content: '어릴 때 즐겨 보던 TV 프로그램이나 영화는?' },
  { id: 36, category: '결혼·가정',   content: '배우자를 처음 만난 날을 기억하시나요?' },
  { id: 37, category: '결혼·가정',   content: '결혼식 날의 기억을 이야기해 주세요.' },
  { id: 38, category: '결혼·가정',   content: '자녀 중 첫째가 태어난 날 기억나시나요?' },
  { id: 39, category: '결혼·가정',   content: '가족과 함께한 가장 행복한 여행은?' },
  { id: 40, category: '결혼·가정',   content: '결혼 후 처음 살던 집의 기억은?' },
  { id: 41, category: '결혼·가정',   content: '자녀를 키우면서 가장 뿌듯했던 순간은?' },
  { id: 42, category: '결혼·가정',   content: '가족과 함께 매년 챙기던 행사나 전통이 있었나요?' },
  { id: 43, category: '결혼·가정',   content: '배우자에게 가장 고마운 일은 무엇인가요?' },
  { id: 44, category: '결혼·가정',   content: '자녀에게 꼭 전하고 싶은 이야기가 있다면?' },
  { id: 45, category: '직업·성취',   content: '첫 직장은 어디였고 어떤 일을 했나요?' },
  { id: 46, category: '직업·성취',   content: '가장 자랑스러운 성취를 꼽는다면?' },
  { id: 47, category: '직업·성취',   content: '일하면서 가장 힘들었던 순간은 언제였나요?' },
  { id: 48, category: '직업·성취',   content: '직장에서 가장 오래 기억에 남는 동료는?' },
  { id: 49, category: '직업·성취',   content: '일을 통해 배운 가장 중요한 것은 무엇인가요?' },
  { id: 50, category: '직업·성취',   content: '젊은 시절 꿈꾸던 직업은 무엇이었나요?' },
  { id: 51, category: '직업·성취',   content: '평생 가장 보람을 느꼈던 일은 무엇인가요?' },
  { id: 52, category: '직업·성취',   content: '은퇴하던 날 또는 마지막 출근날의 기억은?' },
  { id: 53, category: '인생·가치관', content: '살면서 가장 감사한 일은 무엇인가요?' },
  { id: 54, category: '인생·가치관', content: '인생에서 가장 중요하게 여기는 것은?' },
  { id: 55, category: '인생·가치관', content: '다시 산다면 어떤 일을 다르게 하고 싶나요?' },
  { id: 56, category: '인생·가치관', content: '지금의 나에게 가장 큰 영향을 준 사람은?' },
  { id: 57, category: '인생·가치관', content: '인생에서 가장 힘든 고비는 어떻게 넘겼나요?' },
  { id: 58, category: '인생·가치관', content: '살면서 가장 용감하게 한 행동은?' },
  { id: 59, category: '인생·가치관', content: '젊은 세대에게 꼭 전하고 싶은 말이 있다면?' },
  { id: 60, category: '인생·가치관', content: '내 인생을 한 문장으로 표현한다면?' },
  { id: 61, category: '인생·가치관', content: '가장 행복했던 시절은 언제였나요?' },
  { id: 62, category: '현재·일상',   content: '요즘 가장 즐거운 일은 무엇인가요?' },
  { id: 63, category: '현재·일상',   content: '요즘 즐겨 드시는 음식은 무엇인가요?' },
  { id: 64, category: '현재·일상',   content: '가장 자주 연락하는 사람은 누구인가요?' },
  { id: 65, category: '현재·일상',   content: '요즘 자주 가는 장소가 있다면?' },
  { id: 66, category: '현재·일상',   content: '요즘 관심을 갖고 있는 것은 무엇인가요?' },
  { id: 67, category: '현재·일상',   content: '하루 중 가장 좋아하는 시간대는?' },
  { id: 68, category: '현재·일상',   content: '지금 가장 보고 싶은 사람은 누구인가요?' },
  { id: 69, category: '현재·일상',   content: '요즘 즐겨 듣는 음악이나 좋아하는 노래는?' },
  { id: 70, category: '현재·일상',   content: '오늘 아침 무엇을 먹었고 어떤 하루였나요?' },
]

interface Props {
  profileId: string
  initialSelected: number[]
}

const REQUIRED = 29

export default function QuestionSelector({ profileId, initialSelected }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>(initialSelected)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const toggle = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= REQUIRED) return prev
      return [...prev, id]
    })
  }

  const handleSave = async () => {
    if (selected.length !== REQUIRED) return
    setSaving(true)
    setSaveError('')

    const result = await saveSelections(profileId, selected)
    if (result.error) {
      setSaveError(result.error)
      setSaving(false)
      return
    }

    router.push('/home')
  }

  const grouped = QUESTIONS.reduce<Record<string, Question[]>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = []
    acc[q.category].push(q)
    return acc
  }, {})

  return (
    <div className="px-4 pt-10 pb-32">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-deep">나의 문항 선택</h1>
        <p className="text-sm text-muted mt-1">
          녹음할 {REQUIRED}개 문항을 선택해 주세요. 30번 문항(자유 이야기)은 자동으로 포함됩니다.
        </p>
      </div>

      {/* 고정 상단 바 */}
      <div className="sticky top-0 z-10 bg-cream pt-2 pb-3">
        <div className="flex items-center justify-between bg-warm-white border border-muted/20 rounded-2xl px-4 py-3 shadow-sm">
          <div>
            <span className="text-sm text-mid">선택됨 </span>
            <span className={`text-lg font-bold ${selected.length === REQUIRED ? 'text-sage' : 'text-amber'}`}>
              {selected.length}
            </span>
            <span className="text-sm text-muted"> / {REQUIRED}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={selected.length !== REQUIRED || saving}
            className="px-5 py-2 rounded-xl bg-amber text-white text-sm font-semibold hover:bg-amber-dark transition-colors disabled:opacity-40"
          >
            {saving ? '저장 중...' : '완료'}
          </button>
        </div>
        {saveError && <p className="text-xs text-red-500 text-center mt-1">{saveError}</p>}
        {selected.length >= REQUIRED && (
          <p className="text-xs text-sage text-center mt-1">29개 선택 완료! 완료 버튼을 눌러주세요.</p>
        )}
      </div>

      {/* 카테고리별 문항 목록 */}
      {Object.entries(grouped).map(([category, qs]) => (
        <div key={category} className="mb-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
            {category}
          </h2>
          <div className="space-y-2">
            {qs.map((q) => {
              const isSelected = selected.includes(q.id)
              const orderNum = selected.indexOf(q.id) + 1
              const isDisabled = !isSelected && selected.length >= REQUIRED

              return (
                <button
                  key={q.id}
                  onClick={() => toggle(q.id)}
                  disabled={isDisabled}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-amber/10 border-amber/40'
                      : 'bg-warm-white border-muted/20'
                  } ${isDisabled ? 'opacity-35 cursor-not-allowed' : 'active:scale-[0.99]'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-amber border-amber text-white'
                        : 'border-muted/40 text-transparent'
                    }`}>
                      {isSelected ? orderNum : ''}
                    </div>
                    <span className={`text-sm leading-snug ${isSelected ? 'text-deep font-medium' : 'text-mid'}`}>
                      {q.content}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
