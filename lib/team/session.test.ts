// @vitest-environment node
import { describe, expect, test } from "vitest";

import { createSessionToken, verifySessionToken } from "@/lib/admin/session";

import { checkNewTeamPassword, safeTeamNextPath, TEAM_SESSION_MAX_AGE_SECONDS } from "./session";

const now = new Date("2026-10-30T09:00:00+09:00");

describe("팀 로그인 정보", () => {
  test("유지 시간은 30일이다", () => {
    expect(TEAM_SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  test("30일 안에는 유효하고 30일이 지나면 만료된다", () => {
    const token = createSessionToken("team-secret", now, TEAM_SESSION_MAX_AGE_SECONDS);
    const justBefore = new Date(now.getTime() + (TEAM_SESSION_MAX_AGE_SECONDS - 1) * 1000);
    const after = new Date(now.getTime() + (TEAM_SESSION_MAX_AGE_SECONDS + 1) * 1000);
    expect(verifySessionToken(token, "team-secret", justBefore)).toBe(true);
    expect(verifySessionToken(token, "team-secret", after)).toBe(false);
  });

  test("비밀번호가 바뀌어 키가 달라지면 이전 로그인은 거절된다", () => {
    const token = createSessionToken("team-secret", now, TEAM_SESSION_MAX_AGE_SECONDS);
    expect(verifySessionToken(token, "changed-secret", now)).toBe(false);
  });
});

describe("로그인 뒤 이동 주소", () => {
  test("현황 메일 링크의 월을 유지한다", () => {
    expect(safeTeamNextPath("/?month=2026-11")).toBe("/?month=2026-11");
  });

  test("그 밖의 주소는 현황표로 돌린다", () => {
    expect(safeTeamNextPath(undefined)).toBe("/");
    expect(safeTeamNextPath("/admin")).toBe("/");
    expect(safeTeamNextPath("//evil.example")).toBe("/");
    expect(safeTeamNextPath("https://evil.example/?month=2026-11")).toBe("/");
  });
});

describe("새 팀 비밀번호 검사", () => {
  const base = { next: "long-enough-pass", confirm: "long-enough-pass", minLength: 10, sameAsAdmin: false };

  test("규칙을 지키면 통과한다", () => {
    expect(checkNewTeamPassword(base)).toBeNull();
  });

  test("짧거나 확인과 다르면 거절한다", () => {
    expect(checkNewTeamPassword({ ...base, next: "short", confirm: "short" })).toContain("10자");
    expect(checkNewTeamPassword({ ...base, confirm: "different-pass" })).toContain("일치");
  });

  test("관리자 비밀번호와 같으면 거절한다", () => {
    expect(checkNewTeamPassword({ ...base, sameAsAdmin: true })).toContain("관리자 비밀번호와 달라야");
  });
});
