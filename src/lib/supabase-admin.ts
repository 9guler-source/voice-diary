import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 서비스 롤 클라이언트 (RLS 무시).
 * 오직 서버사이드 코드 + 보호자 세션 검증 이후에만 사용하세요.
 * 브라우저 코드에서는 절대 사용 금지.
 *
 * 필요 환경변수: SUPABASE_SERVICE_ROLE_KEY
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "[voice-diary] SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다."
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: "voice_diary" } }
  );
}
