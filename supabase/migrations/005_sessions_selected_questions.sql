-- 005_sessions_selected_questions.sql (v2)
-- 매 세션 자유 선택 방식으로 전환하기 위한 컬럼 추가

alter table voice_diary.sessions
  add column if not exists selected_questions jsonb not null default '[]'::jsonb;
