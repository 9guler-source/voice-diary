-- 002_auto_profile_trigger.sql
-- 회원가입 시 voice_diary.profiles 자동 생성 트리거

create or replace function voice_diary.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into voice_diary.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure voice_diary.handle_new_user();
