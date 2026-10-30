import { beforeEach, describe, expect, test, vi } from "vitest";

const store = vi.hoisted(() => ({ setInterview: vi.fn() }));
const calendar = vi.hoisted(() => ({ isHolidayDate: vi.fn(async () => false) }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/auth", () => ({ isAdmin: vi.fn(async () => false) }));
vi.mock("@/lib/calendar/store", () => calendar);
vi.mock("@/lib/interview/store", () => store);
vi.mock("@/lib/roster/store", () => ({
  getMembers: vi.fn(async () => [
    { name: "양ㅇㅇ", start: null, removedOn: null },
    { name: "홍ㅇㅇ", start: "2026-10-15", removedOn: null },
  ]),
}));

import { isAdmin } from "@/lib/admin/auth";

import { setInterviewCell } from "./actions";

describe("로그인하지 않은 요청", () => {
  beforeEach(() => vi.clearAllMocks());

  test("면담 켜기와 끄기는 거절되고 아무것도 저장되지 않는다", async () => {
    vi.mocked(isAdmin).mockResolvedValue(false);
    for (const on of [true, false]) {
      const result = await setInterviewCell("양ㅇㅇ", "2026-10-15", on);
      expect(result).toEqual({ ok: false, error: expect.stringContaining("로그인") });
    }
    expect(store.setInterview).not.toHaveBeenCalled();
  });
});

describe("로그인한 요청", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdmin).mockResolvedValue(true);
    store.setInterview.mockResolvedValue({ ok: true });
    calendar.isHolidayDate.mockResolvedValue(false);
  });

  test("근무일 칸은 켜고 끌 수 있다", async () => {
    expect((await setInterviewCell("양ㅇㅇ", "2026-10-15", true)).ok).toBe(true);
    expect(store.setInterview).toHaveBeenLastCalledWith("양ㅇㅇ", "2026-10-15", true);
    expect((await setInterviewCell("양ㅇㅇ", "2026-10-15", false)).ok).toBe(true);
    expect(store.setInterview).toHaveBeenLastCalledWith("양ㅇㅇ", "2026-10-15", false);
  });

  test("휴일 칸과 재직 전 칸은 켜지 않는다", async () => {
    calendar.isHolidayDate.mockResolvedValue(true);
    expect((await setInterviewCell("양ㅇㅇ", "2026-10-09", true)).ok).toBe(false);
    calendar.isHolidayDate.mockResolvedValue(false);
    expect((await setInterviewCell("홍ㅇㅇ", "2026-10-14", true)).ok).toBe(false);
    expect(store.setInterview).not.toHaveBeenCalled();
  });

  test("휴일이 된 칸의 이전 면담도 끌 수는 있다", async () => {
    calendar.isHolidayDate.mockResolvedValue(true);
    expect((await setInterviewCell("양ㅇㅇ", "2026-10-09", false)).ok).toBe(true);
    expect(store.setInterview).toHaveBeenLastCalledWith("양ㅇㅇ", "2026-10-09", false);
  });
});
