-- 003_fix_family_read_rls.sql
-- 보호자(가족)가 본인 이메일로 가입 시 피보호자의 세션을 읽을 수 있도록 정책 보강

drop policy if exists sessions_family_read on voice_diary.sessions;
create policy sessions_family_read on voice_diary.sessions
  for select using (
    exists (
      select 1 from voice_diary.guardians g
      join auth.users u on u.id = auth.uid()
      where g.user_id = sessions.user_id
        and g.guardian_email = u.email
    )
  );

drop policy if exists recordings_family_read on voice_diary.recordings;
create policy recordings_family_read on voice_diary.recordings
  for select using (
    exists (
      select 1 from voice_diary.sessions s
      join voice_diary.guardians g on g.user_id = s.user_id
      join auth.users u on u.id = auth.uid()
      where s.id = recordings.session_id
        and g.guardian_email = u.email
    )
  );
