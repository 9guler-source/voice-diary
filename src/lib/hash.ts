import crypto from "crypto";

/**
 * 비밀번호를 scrypt로 해시합니다.
 * 반환 형식: "salt_hex:hash_hex"
 * scrypt는 bcrypt보다 메모리 집약적이어서 GPU 공격에 강합니다.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * 저장된 해시와 입력 비밀번호가 일치하는지 검증합니다.
 * timingSafeEqual을 사용해 타이밍 공격을 방지합니다.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  if (!salt || !hash) return false;

  try {
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(derived, "hex")
    );
  } catch {
    return false;
  }
}
