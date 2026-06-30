-- ============================================
-- 1) 잘못된(혼선을 일으키는) 중복 정책 제거
--    user_id는 auth.uid()가 아니라 profiles.id를 참조하므로
--    "auth.uid() = user_id" 조건의 정책들은 전부 틀린 정책입니다.
-- ============================================
drop policy if exists sessions_select_own on voice_diary.sessions;
drop policy if exists sessions_insert_own on voice_diary.sessions;
drop policy if exists sessions_update_own on voice_diary.sessions;
drop policy if exists sessions_delete_own on voice_diary.sessions;

drop policy if exists recordings_select_own on voice_diary.recordings;
drop policy if exists recordings_insert_own on voice_diary.recordings;
drop policy if exists recordings_delete_own on voice_diary.recordings;

-- 남겨야 하는(올바른) 정책: sessions_own, recordings_own, guardians_own,
-- uq_own, profiles_own, sessions_family_read, recordings_family_read
-- 이 정책들은 모두 profiles 테이블을 거쳐 올바르게 검사하므로 그대로 둡니다.

-- ============================================
-- 2) profiles 자동 생성 트리거 재정의 (실제 컬럼: auth_user_id, name)
-- ============================================
create or replace function voice_diary.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into voice_diary.profiles (auth_user_id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure voice_diary.handle_new_user();

-- ============================================
-- 3) 이미 가입했지만 profiles 행이 없는 기존 계정 보정
-- ============================================
insert into voice_diary.profiles (auth_user_id, name)
select u.id, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
left join voice_diary.profiles p on p.auth_user_id = u.id
where p.id is null;

-- ============================================
-- 4) 확인용 조회 (본인 profile.id가 무엇인지 확인하고 싶을 때)
-- ============================================
-- select * from voice_diary.profiles where auth_user_id = auth.uid();
