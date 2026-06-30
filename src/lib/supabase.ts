"use client";

import { createBrowserClient } from "@supabase/ssr";

// 주의: supabase-js v2의 제네릭 스키마 타입 추론이 voice_diary 같은 커스텀 스키마에서
// 불안정하여(테이블 타입이 never로 좁혀지는 문제) 의도적으로 비제네릭으로 사용합니다.
// 타입은 database.types.ts의 타입을 필요한 곳에서 수동으로 참고하세요.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "voice_diary" } }
  );
}
