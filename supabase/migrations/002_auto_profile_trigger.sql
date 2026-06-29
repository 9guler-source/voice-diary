-- ═══════════════════════════════════════════════════
-- auth.users INSERT 시 voice_diary.profiles 자동 생성 트리거
-- signUp 호출 시 RLS 세션 없이도 프로필이 즉시 생성됨
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION voice_diary.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- auth.users 접근 권한 필요하므로 definer 실행
SET search_path = voice_diary
AS $$
BEGIN
  INSERT INTO voice_diary.profiles (auth_user_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', '사용자')
  );
  RETURN NEW;
END;
$$;

-- auth.users는 public 스키마가 아닌 auth 스키마이므로 trigger를 auth에 생성
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION voice_diary.handle_new_user();
