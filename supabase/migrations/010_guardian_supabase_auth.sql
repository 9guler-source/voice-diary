-- 010_guardian_supabase_auth.sql
-- 보호자 인증을 커스텀 HMAC 토큰에서 Supabase Auth로 전환
-- 전제: 007, 008 마이그레이션 완료 상태

-- ① guardians 테이블에 Supabase Auth 연동 컬럼 추가
ALTER TABLE voice_diary.guardians
  ADD COLUMN IF NOT EXISTS guardian_auth_id        uuid UNIQUE,  -- Supabase auth.users.id
  ADD COLUMN IF NOT EXISTS guardian_synthetic_email text UNIQUE; -- gd_XXXXXXXX@voice.app

-- ② verify_guardian_login 함수 업데이트 (synthetic_email 반환 추가)
--    기존 4인수 함수를 교체. password_hash 제거 (Supabase Auth가 처리).
DROP FUNCTION IF EXISTS voice_diary.verify_guardian_login(text, text, date, date);

CREATE FUNCTION voice_diary.verify_guardian_login(
  p_user_email          text,
  p_guardian_email      text,
  p_user_birth_date     date,
  p_guardian_birth_date date
)
RETURNS TABLE (
  guardian_id             uuid,
  user_profile_id         uuid,
  guardian_synthetic_email text   -- 이 이메일로 signInWithPassword 수행
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = voice_diary, public
AS $$
  SELECT
    g.id                        AS guardian_id,
    g.user_id                   AS user_profile_id,
    g.guardian_synthetic_email
  FROM voice_diary.guardians g
  WHERE lower(g.email)           = lower(p_guardian_email)
    AND lower(g.user_email)      = lower(p_user_email)
    AND g.user_birth_date        = p_user_birth_date
    AND g.guardian_birth_date    = p_guardian_birth_date
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION voice_diary.verify_guardian_login(text, text, date, date) TO anon;

-- ③ 보호자가 자신의 guardian 행을 조회할 수 있도록 RLS 정책 추가
--    (guardian_auth_id = auth.uid() 기반 — 보호자가 Supabase 로그인 후 사용)
DROP POLICY IF EXISTS guardians_guardian_self ON voice_diary.guardians;
CREATE POLICY guardians_guardian_self ON voice_diary.guardians
  FOR SELECT USING (guardian_auth_id = auth.uid());

-- ④ 보호자가 담당 사용자의 sessions를 읽을 수 있도록 RLS 정책 추가
DROP POLICY IF EXISTS sessions_guardian_read ON voice_diary.sessions;
CREATE POLICY sessions_guardian_read ON voice_diary.sessions
  FOR SELECT USING (
    user_id IN (
      SELECT g.user_id
      FROM voice_diary.guardians g
      WHERE g.guardian_auth_id = auth.uid()
    )
  );

-- ⑤ 보호자가 담당 사용자의 recordings를 읽을 수 있도록 RLS 정책 추가
DROP POLICY IF EXISTS recordings_guardian_read ON voice_diary.recordings;
CREATE POLICY recordings_guardian_read ON voice_diary.recordings
  FOR SELECT USING (
    session_id IN (
      SELECT s.id
      FROM voice_diary.sessions s
      WHERE s.user_id IN (
        SELECT g.user_id
        FROM voice_diary.guardians g
        WHERE g.guardian_auth_id = auth.uid()
      )
    )
  );

-- ⑥ 보호자가 담당 사용자의 profiles를 읽을 수 있도록 RLS 정책 추가
--    (보호자 화면 상단 "OOO님의 기록 열람 중" 표시용)
DROP POLICY IF EXISTS profiles_guardian_read ON voice_diary.profiles;
CREATE POLICY profiles_guardian_read ON voice_diary.profiles
  FOR SELECT USING (
    id IN (
      SELECT g.user_id
      FROM voice_diary.guardians g
      WHERE g.guardian_auth_id = auth.uid()
    )
  );

-- ⑦ free_talk_view 보호자 접근 허용
--    (뷰는 기반 테이블의 RLS를 따르므로 sessions/recordings 정책이 적용됨)

-- ⑧ 확인 쿼리 (실행 후 검증용)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'voice_diary' AND table_name = 'guardians'
-- ORDER BY ordinal_position;
