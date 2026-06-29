-- ═══════════════════════════════════════════════════════════════════
-- voice-diary Storage 버킷 생성 및 RLS 정책 설정
--
-- Supabase SQL Editor에서 실행:
--   https://supabase.com/dashboard/project/sfeyfxojkyjdbwpkvcdm/sql/new
--
-- 또는 Supabase 대시보드 → Storage → New Bucket에서 직접 생성 가능
-- ═══════════════════════════════════════════════════════════════════

-- 1. voice-diary 버킷 생성 (public = getPublicUrl 사용 가능)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-diary',
  'voice-diary',
  true,
  52428800,         -- 50MB
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 2. 인증된 사용자: 자신의 폴더에만 업로드 가능
--    경로 구조: {profileId}/{sessionId}/{order}.webm
DROP POLICY IF EXISTS "auth_upload" ON storage.objects;
CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-diary');

-- 3. 인증된 사용자: 자신이 업로드한 파일 수정/덮어쓰기
DROP POLICY IF EXISTS "auth_update" ON storage.objects;
CREATE POLICY "auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'voice-diary');

-- 4. 공개 읽기 (public 버킷 — audio 재생용 URL 직접 접근)
DROP POLICY IF EXISTS "public_read" ON storage.objects;
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'voice-diary');

-- 5. 인증된 사용자: 자신이 업로드한 파일 삭제
DROP POLICY IF EXISTS "auth_delete" ON storage.objects;
CREATE POLICY "auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'voice-diary');
