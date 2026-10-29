import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 10;

const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** `scrypt$<salt>$<hash>` 형태로 암호화한다. 같은 비밀번호도 salt가 달라 저장 값이 매번 다르다. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** 저장 값 형식이 맞지 않으면 항상 거절한다. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex, extra] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex || extra !== undefined) return false;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}

/** 새 비밀번호가 규칙을 어기면 이유를, 지키면 null을 돌려준다. */
export function checkNewPassword(input: { current: string; next: string; confirm: string }): string | null {
  if (input.next.length < MIN_PASSWORD_LENGTH) return `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  if (input.next !== input.confirm) return "새 비밀번호와 확인 입력이 일치하지 않습니다.";
  if (input.next === input.current) return "새 비밀번호는 현재 비밀번호와 달라야 합니다.";
  return null;
}

/** 로그인 뒤에 이동할 주소. 관리 화면 안의 주소만 허용하고 나머지는 관리자 현황표로 돌린다. */
export function safeNextPath(next: string | undefined): string {
  const fallback = "/admin";
  if (!next || !/^\/admin(\/[A-Za-z0-9_\-/]*)?(\?[A-Za-z0-9_\-=&%.]*)?$/.test(next)) return fallback;
  if (next.includes("..") || next.startsWith("/admin/login")) return fallback;
  return next;
}
