import { beforeEach, describe, expect, test, vi } from "vitest";

const setConfirmation = vi.fn(async () => ({ ok: true as const }));
const isAdmin = vi.fn(async () => false);

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ isAdmin: () => isAdmin() }));
vi.mock("@/lib/calendar/store", () => ({ isHolidayDate: async () => false }));
vi.mock("@/app/load-plan", () => ({ loadPlan: async () => ({ planned: ["홍ㅇㅇ|2026-10-01"] }) }));
vi.mock("@/lib/attendance/store", () => ({
  getRecords: async () => [],
  getConfirmations: async () => [],
  setConfirmation: (...args: unknown[]) => (setConfirmation as (...a: unknown[]) => unknown)(...args),
  toggleUnconfirmed: vi.fn(),
}));

import { toggleMorningConfirmation } from "./actions";

describe("아침 확인 토글 요청", () => {
  beforeEach(() => {
    setConfirmation.mockClear();
    isAdmin.mockReset();
  });

  test("로그인하지 않은 요청은 거절되고 아무것도 저장하지 않는다", async () => {
    isAdmin.mockResolvedValue(false);
    const result = await toggleMorningConfirmation("홍ㅇㅇ", "2026-10-01");
    expect(result.ok).toBe(false);
    expect(setConfirmation).not.toHaveBeenCalled();
  });

  test("로그인한 관리자의 계획 리모트 칸 요청은 출근으로 저장된다", async () => {
    isAdmin.mockResolvedValue(true);
    const result = await toggleMorningConfirmation("홍ㅇㅇ", "2026-10-01");
    expect(result).toEqual({ ok: true, state: "present" });
    expect(setConfirmation).toHaveBeenCalledWith("홍ㅇㅇ", "2026-10-01", "present");
  });

  test("리모트가 아닌 칸은 로그인해도 거절되고 저장하지 않는다", async () => {
    isAdmin.mockResolvedValue(true);
    const result = await toggleMorningConfirmation("양ㅇㅇ", "2026-10-01");
    expect(result.ok).toBe(false);
    expect(setConfirmation).not.toHaveBeenCalled();
  });
});
