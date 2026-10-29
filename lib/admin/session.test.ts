// @vitest-environment node
import { describe, expect, test } from "vitest";

import { createSessionToken, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "./session";

const now = new Date("2026-10-29T09:00:00+09:00");
const secret = "credential-material-A";

describe("관리자 로그인 정보(서명된 토큰)", () => {
  test("방금 만든 토큰은 유효하다", () => {
    const token = createSessionToken(secret, now);
    expect(verifySessionToken(token, secret, now)).toBe(true);
  });

  test("로그인 유지 시간은 12시간이다", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(12 * 60 * 60);
  });

  test("12시간 안에는 유효하고 12시간이 지나면 만료된다", () => {
    const token = createSessionToken(secret, now);
    const justBefore = new Date(now.getTime() + (SESSION_MAX_AGE_SECONDS - 1) * 1000);
    const after = new Date(now.getTime() + (SESSION_MAX_AGE_SECONDS + 1) * 1000);
    expect(verifySessionToken(token, secret, justBefore)).toBe(true);
    expect(verifySessionToken(token, secret, after)).toBe(false);
  });

  test("만료 시각을 고쳐 늘린 토큰은 거절한다", () => {
    const token = createSessionToken(secret, now);
    const [, signature] = token.split(".");
    const forged = `${now.getTime() + 999_999_999}.${signature}`;
    expect(verifySessionToken(forged, secret, now)).toBe(false);
  });

  test("서명을 바꾼 토큰과 형식이 맞지 않는 값은 거절한다", () => {
    const token = createSessionToken(secret, now);
    const [expires] = token.split(".");
    expect(verifySessionToken(`${expires}.${"0".repeat(64)}`, secret, now)).toBe(false);
    expect(verifySessionToken("", secret, now)).toBe(false);
    expect(verifySessionToken("abc", secret, now)).toBe(false);
    expect(verifySessionToken("abc.def", secret, now)).toBe(false);
    expect(verifySessionToken(undefined, secret, now)).toBe(false);
  });

  test("비밀번호가 바뀌어 키가 달라지면 이전 토큰은 거절한다", () => {
    const token = createSessionToken(secret, now);
    expect(verifySessionToken(token, "credential-material-B", now)).toBe(false);
  });
});
