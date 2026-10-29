// @vitest-environment node
import { describe, expect, test } from "vitest";

import { checkNewPassword, hashPassword, MIN_PASSWORD_LENGTH, safeNextPath, verifyPassword } from "./password";

describe("비밀번호 암호화", () => {
  test("저장 값에 비밀번호 원문이 들어 있지 않고, 맞는 비밀번호만 통과한다", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).not.toContain("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterx", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  test("같은 비밀번호도 저장할 때마다 다른 값이 된다", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password-123"), hashPassword("same-password-123")]);
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password-123", a)).toBe(true);
    expect(await verifyPassword("same-password-123", b)).toBe(true);
  });

  test("형식이 맞지 않는 저장 값은 어떤 비밀번호도 통과시키지 않는다", async () => {
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "scrypt$zz")).toBe(false);
    expect(await verifyPassword("anything", "plain-text-password")).toBe(false);
  });
});

describe("새 비밀번호 규칙", () => {
  const ok = { current: "old-password-1", next: "new-password-123", confirm: "new-password-123" };

  test("조건을 모두 채우면 통과한다", () => {
    expect(checkNewPassword(ok)).toBeNull();
  });

  test(`${MIN_PASSWORD_LENGTH}자 미만이면 거절한다`, () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(checkNewPassword({ ...ok, next: short, confirm: short })).toContain(`${MIN_PASSWORD_LENGTH}자`);
    const exact = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(checkNewPassword({ ...ok, next: exact, confirm: exact })).toBeNull();
  });

  test("확인 입력과 다르면 거절한다", () => {
    expect(checkNewPassword({ ...ok, confirm: "different-password" })).toContain("일치");
  });

  test("현재 비밀번호와 같으면 거절한다", () => {
    expect(checkNewPassword({ current: "same-password-123", next: "same-password-123", confirm: "same-password-123" })).toContain(
      "달라야",
    );
  });
});

describe("로그인 뒤 이동 주소", () => {
  test("관리 화면 안의 주소만 따른다", () => {
    expect(safeNextPath("/admin/import")).toBe("/admin/import");
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/admin?month=2026-11")).toBe("/admin?month=2026-11");
  });

  test("다른 사이트나 관리 화면 밖의 주소는 관리자 현황표로 돌린다", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/", "/adminx", "/admin/../etc", "javascript:alert(1)", "", undefined]) {
      expect(safeNextPath(bad)).toBe("/admin");
    }
  });

  test("로그인 화면으로 다시 돌려보내지 않는다", () => {
    expect(safeNextPath("/admin/login")).toBe("/admin");
    expect(safeNextPath("/admin/login?next=/admin")).toBe("/admin");
  });
});
