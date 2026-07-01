-- 008_guardian_v2.sql
-- 보호자 인증 v2: 생년월일 기반 인증으로 전환
-- 실행 전제: 007_guardian_auth.sql 완료 상태

-- ① guardians 테이블에 생년월일 컬럼 추가
ALTER TABLE voice_diary.guardians
  ADD COLUMN IF NOT EXISTS guardian_birth_date date,  -- 보호자 생년월일
  ADD COLUMN IF NOT EXISTS user_birth_date     date;  -- 사용자 생년월일 캐시 (로그인 조회용)

-- ② 기존 2인수 함수 제거
DROP FUNCTION IF EXISTS voice_diary.verify_guardian_login(text, text);

-- ③ 새 4인수 함수 생성 (생년월일 포함)
--    사용자 이메일 + 보호자 이메일 + 사용자 생년월일 + 보호자 생년월일 + 비밀번호 5중 검증
CREATE OR REPLACE FUNCTION voice_diary.verify_guardian_login(
  p_user_email          text,
  p_guardian_email      text,
  p_user_birth_date     date,
  p_guardian_birth_date date
)
RETURNS TABLE (
  guardian_id     uuid,
  user_profile_id uuid,
  password_hash   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = voice_diary, public
AS $$
  SELECT
    g.id      AS guardian_id,
    g.user_id AS user_profile_id,
    g.password_hash
  FROM voice_diary.guardians g
  WHERE lower(g.email)           = lower(p_guardian_email)
    AND lower(g.user_email)      = lower(p_user_email)
    AND g.user_birth_date        = p_user_birth_date
    AND g.guardian_birth_date    = p_guardian_birth_date
    AND g.password_hash IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION voice_diary.verify_guardian_login(text, text, date, date) TO anon;

-- ④ 확인 쿼리
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'voice_diary' AND table_name = 'guardians';
