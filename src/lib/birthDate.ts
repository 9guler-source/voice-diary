/**
 * 사용자가 입력한 생년월일(YYYYMMDD 형식, 예: 19910812)을
 * DB 저장용 ISO 날짜 문자열(1991-08-12)로 변환합니다.
 * 유효하지 않으면 null 반환.
 */
export function parseBirthDate(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const year = parseInt(digits.slice(0, 4));
  const month = parseInt(digits.slice(4, 6));
  const day = parseInt(digits.slice(6, 8));

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/**
 * DB에서 읽은 날짜(1991-08-12)를 한국어 표시 형식으로 변환합니다.
 * 사용자 입력(19910812)도 지원합니다.
 */
export function formatBirthDateKo(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}년 ${digits.slice(4, 6)}월 ${digits.slice(6, 8)}일`;
  }
  return raw;
}

/**
 * 4자리 비밀번호 유효성 검사
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
