import { describe, expect, test } from "vitest";

import { checkCanMarkUnconfirmed } from "./unconfirmed";

const today = "2026-10-29"; // 목요일

describe("미확인(?)으로 바꿀 수 있는 칸", () => {
  test("오늘의 일정 없는 근무일 칸은 바꿀 수 있다", () => {
    expect(checkCanMarkUnconfirmed({ date: today, today, hasRecord: false, isHoliday: false })).toEqual({ ok: true });
  });

  test("지난 근무일의 일정 없는 칸도 바꿀 수 있다", () => {
    expect(checkCanMarkUnconfirmed({ date: "2026-10-28", today, hasRecord: false, isHoliday: false })).toEqual({ ok: true });
  });

  test("근태 기록이 이미 있는 칸은 거절한다", () => {
    const result = checkCanMarkUnconfirmed({ date: today, today, hasRecord: true, isHoliday: false });
    expect(result.ok).toBe(false);
  });

  test("오늘보다 뒤 날짜는 거절한다", () => {
    const result = checkCanMarkUnconfirmed({ date: "2026-10-30", today, hasRecord: false, isHoliday: false });
    expect(result.ok).toBe(false);
  });

  test("주말은 거절한다", () => {
    const result = checkCanMarkUnconfirmed({ date: "2026-10-25", today, hasRecord: false, isHoliday: false });
    expect(result.ok).toBe(false);
  });

  test("달력에 없는 날짜는 거절한다", () => {
    const result = checkCanMarkUnconfirmed({ date: "2026-02-30", today, hasRecord: false, isHoliday: false });
    expect(result.ok).toBe(false);
  });

  test("휴일에는 근태 기록이 없어도 거절한다", () => {
    const result = checkCanMarkUnconfirmed({ date: today, today, hasRecord: false, isHoliday: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("휴일");
  });
});
