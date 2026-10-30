import { beforeEach, describe, expect, test, vi } from "vitest";

const store = vi.hoisted(() => ({ setCellEdit: vi.fn(), setWeekOverride: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ isAdmin: vi.fn(async () => false) }));
vi.mock("@/lib/calendar/store", () => ({ getCalendarEntries: vi.fn(async () => []) }));
vi.mock("@/lib/remote/store", () => ({
  ...store,
  addGroup: vi.fn(),
  applyRule: vi.fn(),
  assignMember: vi.fn(),
  deleteGroup: vi.fn(),
  getRemoteSetup: vi.fn(async () => ({ groups: [], unassigned: ["양ㅇㅇ"], rules: [] })),
  renameGroup: vi.fn(),
}));

vi.mock("@/lib/roster/store", () => ({ getMembers: vi.fn(async () => [{ id: 7, name: "양ㅇㅇ", start: null, removedOn: null }]) }));

import { setRemoteCell, setRemoteSkipWeek } from "./actions";

describe("로그인하지 않은 요청", () => {
  beforeEach(() => vi.clearAllMocks());

  test("칸 직접 수정은 거절되고 저장되지 않는다", async () => {
    const result = await setRemoteCell("양ㅇㅇ", "2026-10-15", true);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("로그인") });
    expect(store.setCellEdit).not.toHaveBeenCalled();
  });

  test("주 체크는 거절되고 저장되지 않는다", async () => {
    const result = await setRemoteSkipWeek("2026-10-12", true);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("로그인") });
    expect(store.setWeekOverride).not.toHaveBeenCalled();
  });
});

describe("로그인한 요청", () => {
  test("규칙과 같아지면 직접 수정을 지우고, 다르면 저장한다", async () => {
    const { isAdmin } = await import("@/lib/admin/auth");
    vi.mocked(isAdmin).mockResolvedValue(true);
    store.setCellEdit.mockResolvedValue({ ok: true });
    store.setWeekOverride.mockResolvedValue({ ok: true });

    await setRemoteCell("양ㅇㅇ", "2026-10-15", true);
    expect(store.setCellEdit).toHaveBeenLastCalledWith("양ㅇㅇ", "2026-10-15", "add", 7);
    await setRemoteCell("양ㅇㅇ", "2026-10-15", false);
    expect(store.setCellEdit).toHaveBeenLastCalledWith("양ㅇㅇ", "2026-10-15", null, 7);

    await setRemoteSkipWeek("2026-10-12", true);
    expect(store.setWeekOverride).toHaveBeenLastCalledWith("2026-10-12", true);
    await setRemoteSkipWeek("2026-10-12", false);
    expect(store.setWeekOverride).toHaveBeenLastCalledWith("2026-10-12", null);

    const weekend = await setRemoteCell("양ㅇㅇ", "2026-10-17", true);
    expect(weekend.ok).toBe(false);
  });
});
