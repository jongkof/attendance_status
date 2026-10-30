import { createHmac, timingSafeEqual } from "node:crypto";

/** 로그인 유지 시간: 12시간 */
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function sign(expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
}

/** `<만료 시각(ms)>.<서명>` 형태의 로그인 토큰을 만든다. secret은 현재 비밀번호에서 파생한 값이다. */
export function createSessionToken(
  secret: string,
  now: Date = new Date(),
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): string {
  const expiresAt = now.getTime() + maxAgeSeconds * 1000;
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

/** 서명이 맞고 아직 만료되지 않은 토큰만 유효하다. 형식이 틀리거나 값이 없으면 거절한다. */
export function verifySessionToken(token: string | undefined, secret: string, now: Date = new Date()): boolean {
  if (!token) return false;
  const [expires, signature, extra] = token.split(".");
  if (!expires || !signature || extra !== undefined || !/^\d+$/.test(expires)) return false;

  const expected = Buffer.from(sign(Number(expires), secret), "hex");
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

  return Number(expires) > now.getTime();
}
