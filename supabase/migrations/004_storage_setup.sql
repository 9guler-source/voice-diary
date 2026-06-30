-- 004_storage_setup.sql
-- voice-diary Storage 버킷 (비공개) + RLS
-- 버킷 생성 자체는 Supabase 대시보드에서 수행 (Public: OFF)
-- 경로 규칙: {user_id}/{session_temp_id}/{question_id}-{timestamp}.{ext}

create policy "voice_diary_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-diary'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "voice_diary_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'voice-diary'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "voice_diary_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'voice-diary'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
