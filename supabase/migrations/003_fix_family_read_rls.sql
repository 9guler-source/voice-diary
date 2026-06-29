-- ═══════════════════════════════════════════════════════════════════
-- sessions_family_read, recordings_family_read 정책에서
-- auth.users 직접 조회 제거 → auth.email() 함수로 교체
--
-- 문제: authenticated role은 auth.users 테이블에 SELECT 권한 없음
--       INSERT...RETURNING 또는 SELECT/UPDATE 시 permission denied 발생
-- 해결: auth.email() 은 JWT 클레임에서 이메일을 읽으므로
--       auth.users 조회 없이 동일하게 동작
--
-- Supabase SQL Editor에서 실행:
--   https://supabase.com/dashboard/project/sfeyfxojkyjdbwpkvcdm/sql/new
-- ═══════════════════════════════════════════════════════════════════

-- sessions_family_read 수정
DROP POLICY IF EXISTS "sessions_family_read" ON voice_diary.sessions;

CREATE POLICY "sessions_family_read" ON voice_diary.sessions
  FOR SELECT USING (
    user_id IN (
      SELECT g.user_id
      FROM voice_diary.guardians g
      WHERE g.email = auth.email()
    )
  );

-- recordings_family_read 수정
DROP POLICY IF EXISTS "recordings_family_read" ON voice_diary.recordings;

CREATE POLICY "recordings_family_read" ON voice_diary.recordings
  FOR SELECT USING (
    session_id IN (
      SELECT s.id
      FROM voice_diary.sessions s
      WHERE s.user_id IN (
        SELECT g.user_id
        FROM voice_diary.guardians g
        WHERE g.email = auth.email()
      )
    )
  );
