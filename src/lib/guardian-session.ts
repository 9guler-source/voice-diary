import crypto from "crypto";

const SECRET =
  process.env.GUARDIAN_SESSION_SECRET ?? "dev-guardian-secret-CHANGE-IN-PROD";
export const GUARDIAN_COOKIE = "vd_guardian_session";
const EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export type GuardianPayload = {
  gid: string; // guardians.id
  uid: string; // profiles.id (열람 대상 사용자)
  exp: number; // 만료 타임스탬프 (ms)
};

/**
 * 보호자 세션 토큰을 생성합니다.
 * 형식: base64url(payload).base64url(HMAC-SHA256 서명)
 */
export function createGuardianToken(gid: string, uid: string): string {
  const payload: GuardianPayload = { gid, uid, exp: Date.now() + EXPIRES_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

/**
 * 토큰을 검증하고 페이로드를 반환합니다.
 * 서명 불일치 또는 만료 시 null 반환.
 */
export function verifyGuardianToken(token: string): GuardianPayload | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const data = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  try {
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(data)
      .digest("base64url");

    // 길이가 다르면 timingSafeEqual이 예외를 던지므로 먼저 확인
    if (sig.length !== expected.length) return null;

    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, "utf8"),
        Buffer.from(expected, "utf8")
      )
    )
      return null;

    const payload: GuardianPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    );
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
