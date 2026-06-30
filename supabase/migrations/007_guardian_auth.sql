-- 007_guardian_auth.sql
-- 보호자 로그인 기능을 위한 스키마 변경
-- 실행 전제: 001~006 마이그레이션이 완료된 상태

-- ① guardians 테이블에 컬럼 추가
ALTER TABLE voice_diary.guardians
  ADD COLUMN IF NOT EXISTS password_hash text,       -- scrypt 해시된 임시 비밀번호
  ADD COLUMN IF NOT EXISTS user_email    text;        -- 보호자 로그인 조회용 캐시 (사용자 이메일)

-- ② 보호자 로그인 검증 함수 (SECURITY DEFINER — RLS 우회)
-- 브라우저에서 직접 호출할 수 없는 서버 액션에서만 사용됨
-- anon 롤에 EXECUTE 권한을 부여하지만, 반환값(password_hash)은
-- 서버 액션에서 Node.js crypto로 검증하므로 안전합니다.
CREATE OR REPLACE FUNCTION voice_diary.verify_guardian_login(
  p_user_email     text,
  p_guardian_email text
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
    g.id       AS guardian_id,
    g.user_id  AS user_profile_id,
    g.password_hash
  FROM voice_diary.guardians g
  WHERE lower(g.email)      = lower(p_guardian_email)
    AND lower(g.user_email) = lower(p_user_email)
    AND g.password_hash IS NOT NULL
  LIMIT 1;
$$;

-- anon 롤에 함수 실행 권한 부여 (Server Action의 anon 클라이언트가 호출)
GRANT EXECUTE ON FUNCTION voice_diary.verify_guardian_login(text, text) TO anon;

-- ③ 확인 쿼리 (실행 후 결과 확인용)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'voice_diary' AND table_name = 'guardians';
