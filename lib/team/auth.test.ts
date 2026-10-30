// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

import { createSessionToken } from "@/lib/admin/session";

const cookieValue = vi.fn<() => string | undefined>();
const isAdmin = vi.fn(async () => false);
const getTeamCredential = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookieValue() ? { value: cookieValue() } : undefined) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("@/lib/admin/auth", () => ({ isAdmin: () => isAdmin() }));
vi.mock("./credential", async () => {
  const actual = await vi.importActual<typeof import("./credential")>("./credential");
  return { ...actual, getTeamCredential: () => getTeamCredential() };
});

import { canViewBoard, requireViewer } from "./auth";
import { teamSessionSecret } from "./credential";
import { TEAM_SESSION_MAX_AGE_SECONDS } from "./session";

const credential = { kind: "env", password: "team-password" } as const;

describe("현황표 접근 검사", () => {
  beforeEach(() => {
    cookieValue.mockReset();
    isAdmin.mockReset().mockResolvedValue(false);
    getTeamCredential.mockReset().mockResolvedValue(credential);
  });

  test("로그인하지 않으면 볼 수 없고 팀 로그인 화면으로 보낸다", async () => {
    expect(await canViewBoard()).toBe(false);
    await expect(requireViewer("/?month=2026-11")).rejects.toThrow("redirect:/login?next=%2F%3Fmonth%3D2026-11");
  });

  test("유효한 팀 로그인 쿠키가 있으면 볼 수 있다", async () => {
    cookieValue.mockReturnValue(createSessionToken(teamSessionSecret(credential), new Date(), TEAM_SESSION_MAX_AGE_SECONDS));
    expect(await canViewBoard()).toBe(true);
  });

  test("팀 비밀번호가 바뀌면 이전 팀 로그인 쿠키는 거절된다", async () => {
    cookieValue.mockReturnValue(createSessionToken(teamSessionSecret(credential), new Date(), TEAM_SESSION_MAX_AGE_SECONDS));
    getTeamCredential.mockResolvedValue({ kind: "stored", hash: "scrypt$aa$bb" });
    expect(await canViewBoard()).toBe(false);
  });

  test("30일이 지난 쿠키는 거절된다", async () => {
    const old = new Date(Date.now() - (TEAM_SESSION_MAX_AGE_SECONDS + 60) * 1000);
    cookieValue.mockReturnValue(createSessionToken(teamSessionSecret(credential), old, TEAM_SESSION_MAX_AGE_SECONDS));
    expect(await canViewBoard()).toBe(false);
  });

  test("변조된 쿠키는 거절된다", async () => {
    cookieValue.mockReturnValue("9999999999999.deadbeef");
    expect(await canViewBoard()).toBe(false);
  });

  test("비밀번호 설정이 없거나 읽기에 실패하면 거절된다", async () => {
    cookieValue.mockReturnValue(createSessionToken(teamSessionSecret(credential), new Date(), TEAM_SESSION_MAX_AGE_SECONDS));
    getTeamCredential.mockRejectedValue(new Error("db down"));
    expect(await canViewBoard()).toBe(false);
  });

  test("관리자로 로그인했으면 팀 로그인 없이 볼 수 있다", async () => {
    isAdmin.mockResolvedValue(true);
    expect(await canViewBoard()).toBe(true);
    await expect(requireViewer("/")).resolves.toBeUndefined();
  });
});
