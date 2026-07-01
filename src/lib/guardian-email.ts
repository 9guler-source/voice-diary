/**
 * 보호자 합성 이메일 생성 — 결정적(Deterministic) 방식
 *
 * 형식: {사용자이메일정제}_{보호자이메일정제}@voice.app
 * 예:
 *   james@gmail.com + mom@naver.com  → jamesgmailcom_momnavercom@voice.app
 *   cte@naver.com   + son@kakao.com → ctenavercom_sonkakaocom@voice.app
 *
 * 장점:
 *   - 랜덤 생성/중복 체크 불필요 (조합 자체가 고유)
 *   - 로그에서 어느 사용자·보호자 쌍인지 즉시 파악 가능
 *   - 보호자 재등록 시 동일한 이메일 생성 → 예측 가능
 *
 * 이메일 로컬 파트 최대 64자 제약 → 각 30자로 제한 (30+1+30=61자)
 */
export function generateGuardianEmail(
  userEmail: string,
  guardianEmail: string
): string {
  const sanitize = (email: string): string =>
    email
      .toLowerCase()
      .replace(/[@.]/g, "")        // @ 와 . 제거
      .replace(/[^a-z0-9]/g, "")  // 영소문자·숫자만 남김
      .slice(0, 30);               // 최대 30자

  const userPart     = sanitize(userEmail);
  const guardianPart = sanitize(guardianEmail);

  return `${userPart}_${guardianPart}@voice.app`;
}

/**
 * Supabase Auth 비밀번호 유도.
 * PIN(4자리) + 사용자 생년월일 + 보호자 생년월일 조합으로 강도 향상.
 * 등록 시와 로그인 시 반드시 동일하게 호출해야 함.
 *
 * 예: pin="1234", userBirth="1951-02-08", guardianBirth="1991-08-12"
 *   → "1234_1951-02-08_1991-08-12"
 */
export function deriveGuardianPassword(
  pin: string,
  userBirthDate: string,     // "1951-02-08" 형식
  guardianBirthDate: string  // "1991-08-12" 형식
): string {
  return `${pin}_${userBirthDate}_${guardianBirthDate}`;
}

/**
 * 이메일이 시스템 생성 보호자 계정인지 확인.
 * 미들웨어에서 보호자 세션과 일반 사용자 세션을 구분하는 데 사용.
 */
export function isGuardianEmail(email: string): boolean {
  return email.endsWith("@voice.app");
}
