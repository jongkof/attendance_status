import { beforeEach, describe, expect, test, vi } from "vitest";

const setConfirmation = vi.fn(async () => ({ ok: true as const }));
const isAdmin = vi.fn(async () => false);
const editCell = vi.fn(async () => ({ ok: true as const }));
const isHoliday = vi.fn(async () => false);

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ isAdmin: () => isAdmin() }));
vi.mock("@/lib/calendar/store", () => ({ isHolidayDate: () => isHoliday() }));
vi.mock("@/app/load-plan", () => ({ loadPlan: async () => ({ planned: ["홍ㅇㅇ|2026-10-01"] }) }));
vi.mock("@/lib/attendance/store", () => ({
  getRecords: async () => [],
  getConfirmations: async () => [],
  setConfirmation: (...args: unknown[]) => (setConfirmation as (...a: unknown[]) => unknown)(...args),
  toggleUnconfirmed: vi.fn(),
  editCell: (...args: unknown[]) => (editCell as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("@/lib/roster/store", () => ({
  getMembers: async () => [
    { name: "양ㅇㅇ", start: null, removedOn: null },
    { name: "홍ㅇㅇ", start: "2026-10-15", removedOn: null },
  ],
}));

import { editAttendanceCell, toggleMorningConfirmation } from "./actions";

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

describe("개별 수정 요청", () => {
  beforeEach(() => {
    editCell.mockClear();
    isAdmin.mockReset();
    isHoliday.mockResolvedValue(false);
  });

  test("로그인하지 않은 요청은 거절되고 아무것도 저장하지 않는다", async () => {
    isAdmin.mockResolvedValue(false);
    const result = await editAttendanceCell("양ㅇㅇ", "2026-11-02", { kind: "record", type: "휴가", period: null });
    expect(result).toEqual({ ok: false, error: expect.stringContaining("로그인") });
    expect(await editAttendanceCell("양ㅇㅇ", "2026-11-02", { kind: "clear" })).toMatchObject({ ok: false });
    expect(editCell).not.toHaveBeenCalled();
  });

  test("로그인한 관리자의 요청은 수정 시각을 수신 시각으로 해서 저장된다", async () => {
    isAdmin.mockResolvedValue(true);
    const before = Date.now();
    const result = await editAttendanceCell("양ㅇㅇ", "2026-11-02", { kind: "record", type: "반차", period: "오후" });
    expect(result).toEqual({ ok: true });
    const [name, date, choice, receivedAt] = editCell.mock.calls[0] as unknown as [string, string, unknown, string];
    expect([name, date, choice]).toEqual(["양ㅇㅇ", "2026-11-02", { kind: "record", type: "반차", period: "오후" }]);
    expect(Date.parse(receivedAt)).toBeGreaterThanOrEqual(before);
  });

  test("기록 지우기도 저장 요청으로 넘어간다", async () => {
    isAdmin.mockResolvedValue(true);
    expect(await editAttendanceCell("양ㅇㅇ", "2026-11-02", { kind: "clear" })).toEqual({ ok: true });
    expect(editCell).toHaveBeenCalledTimes(1);
  });

  test("구분 없는 반차, 휴일 칸, 재직 전 칸은 로그인해도 거절된다", async () => {
    isAdmin.mockResolvedValue(true);
    expect((await editAttendanceCell("양ㅇㅇ", "2026-11-02", { kind: "record", type: "반차", period: null })).ok).toBe(false);
    isHoliday.mockResolvedValue(true);
    expect((await editAttendanceCell("양ㅇㅇ", "2026-11-02", { kind: "record", type: "휴가", period: null })).ok).toBe(false);
    isHoliday.mockResolvedValue(false);
    expect((await editAttendanceCell("홍ㅇㅇ", "2026-10-14", { kind: "record", type: "휴가", period: null })).ok).toBe(false);
    expect((await editAttendanceCell("없는ㅇㅇ", "2026-11-02", { kind: "clear" })).ok).toBe(false);
    expect(editCell).not.toHaveBeenCalled();
  });
});
