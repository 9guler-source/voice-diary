-- 세션별 선택 문항 저장 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE voice_diary.sessions
ADD COLUMN IF NOT EXISTS selected_questions jsonb DEFAULT '[]';

COMMENT ON COLUMN voice_diary.sessions.selected_questions IS
  '이 세션에서 녹음한 문항 목록. 형식: [{question_id: number, order: number}]';
