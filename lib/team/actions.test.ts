// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const isAdmin = vi.fn(async () => false);
const getCredential = vi.fn();
const checkPassword = vi.fn();
const saveTeamPassword = vi.fn(async () => undefined);

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ isAdmin: () => isAdmin(), endSession: vi.fn() }));
vi.mock("@/lib/admin/credential", () => ({
  getCredential: () => getCredential(),
  checkPassword: (...args: unknown[]) => checkPassword(...args),
}));
vi.mock("./auth", () => ({ startTeamSession: vi.fn(), endTeamSession: vi.fn() }));
vi.mock("./credential", () => ({
  getTeamCredential: vi.fn(),
  checkTeamPassword: vi.fn(),
  saveTeamPassword: (...args: unknown[]) => (saveTeamPassword as (...a: unknown[]) => unknown)(...args),
}));

import { changeTeamPassword } from "./actions";

function form(next: string, confirm = next) {
  const data = new FormData();
  data.set("next", next);
  data.set("confirm", confirm);
  return data;
}

describe("팀 비밀번호 변경 요청", () => {
  beforeEach(() => {
    isAdmin.mockReset();
    getCredential.mockReset().mockResolvedValue({ kind: "env", password: "admin-password" });
    checkPassword.mockReset().mockResolvedValue(false);
    saveTeamPassword.mockClear();
  });

  test("관리자로 로그인하지 않은 요청은 거절되고 저장하지 않는다", async () => {
    isAdmin.mockResolvedValue(false);
    const result = await changeTeamPassword(undefined, form("new-team-password"));
    expect(result?.error).toBeTruthy();
    expect(saveTeamPassword).not.toHaveBeenCalled();
  });

  test("관리자 비밀번호와 같은 값은 거절되고 저장하지 않는다", async () => {
    isAdmin.mockResolvedValue(true);
    checkPassword.mockResolvedValue(true);
    const result = await changeTeamPassword(undefined, form("admin-password"));
    expect(result?.error).toContain("관리자 비밀번호와 달라야");
    expect(saveTeamPassword).not.toHaveBeenCalled();
  });

  test("관리자가 올바른 값을 보내면 저장된다", async () => {
    isAdmin.mockResolvedValue(true);
    const result = await changeTeamPassword(undefined, form("new-team-password"));
    expect(result).toEqual({ done: true });
    expect(saveTeamPassword).toHaveBeenCalledWith("new-team-password");
  });
});
