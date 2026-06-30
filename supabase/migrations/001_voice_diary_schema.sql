-- 001_voice_diary_schema.sql
-- voice_diary 스키마 및 테이블 생성, RLS, GRANT, 문항 시드

create schema if not exists voice_diary;

-- 1) profiles
create table if not exists voice_diary.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2) guardians
create table if not exists voice_diary.guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references voice_diary.profiles(id) on delete cascade,
  guardian_email text not null,
  guardian_name text,
  created_at timestamptz not null default now()
);

-- 3) questions (마스터, 현재 앱은 CORS 우회로 하드코딩 사용 중이나 DB도 동기화 유지)
create table if not exists voice_diary.questions (
  id integer primary key,
  category text not null,
  question_text text not null,
  tts_text text not null,
  starter_text text not null,
  is_free_talk boolean not null default false,
  display_order integer not null
);

-- 4) user_questions (레거시 v1, v2에서는 세션에서 미참조)
create table if not exists voice_diary.user_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references voice_diary.profiles(id) on delete cascade,
  question_id integer not null references voice_diary.questions(id),
  created_at timestamptz not null default now()
);

-- 5) sessions
create table if not exists voice_diary.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references voice_diary.profiles(id) on delete cascade,
  selected_questions jsonb not null default '[]'::jsonb,
  recorded_at timestamptz not null default now(),
  title text
);

-- 6) recordings
create table if not exists voice_diary.recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references voice_diary.sessions(id) on delete cascade,
  question_id integer not null,
  question_text text not null,
  file_path text not null,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_id on voice_diary.sessions(user_id);
create index if not exists idx_recordings_session_id on voice_diary.recordings(session_id);
create index if not exists idx_recordings_question_id on voice_diary.recordings(question_id);
create index if not exists idx_guardians_user_id on voice_diary.guardians(user_id);

-- RLS
alter table voice_diary.profiles enable row level security;
alter table voice_diary.guardians enable row level security;
alter table voice_diary.questions enable row level security;
alter table voice_diary.user_questions enable row level security;
alter table voice_diary.sessions enable row level security;
alter table voice_diary.recordings enable row level security;

create policy profiles_self on voice_diary.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy guardians_self on voice_diary.guardians
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy questions_read_all on voice_diary.questions
  for select using (true);

create policy user_questions_self on voice_diary.user_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sessions_self on voice_diary.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy recordings_self on voice_diary.recordings
  for all using (
    exists (select 1 from voice_diary.sessions s where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from voice_diary.sessions s where s.id = session_id and s.user_id = auth.uid())
  );

-- GRANT (커스텀 스키마 필수 설정 5.3 참조)
grant usage on schema voice_diary to anon, authenticated;
grant select, insert, update, delete on all tables in schema voice_diary to authenticated;
grant select on voice_diary.questions to anon;
alter default privileges in schema voice_diary grant select, insert, update, delete on tables to authenticated;

-- 문항 시드 71개는 src/lib/questions.ts 내용과 동일하게 별도 INSERT 스크립트로 채워주세요.
-- (questions 테이블은 현재 앱에서 직접 조회하지 않고 하드코딩을 사용하므로 시드는 선택사항입니다.)
