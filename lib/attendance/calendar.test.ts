import { describe, expect, test } from "vitest";

import { formatMonth, parseMonth, shiftMonth, todayInSeoul, weekdayLabel, weekdaysOfMonth } from "./calendar";

describe("월간 표의 날짜 열", () => {
  test("2026년 10월은 월–금만 22일이고 첫 열은 10/1(목), 마지막 열은 10/30(금)이다", () => {
    const days = weekdaysOfMonth(2026, 10);
    expect(days).toHaveLength(22);
    expect(days[0]).toBe("2026-10-01");
    expect(days.at(-1)).toBe("2026-10-30");
    expect(days).not.toContain("2026-10-31");
    expect(days).not.toContain("2026-10-03");
  });

  test("2026년 11월은 11/2(월)부터 시작하고 주말 열이 없다", () => {
    const days = weekdaysOfMonth(2026, 11);
    expect(days[0]).toBe("2026-11-02");
    expect(days.every((d) => !["토", "일"].includes(weekdayLabel(d)))).toBe(true);
  });

  test("요일 이름을 한글로 돌려준다", () => {
    expect(weekdayLabel("2026-10-29")).toBe("목");
  });
});

describe("월 이동", () => {
  test("연말과 연초를 넘어 이전 달과 다음 달을 계산한다", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  test("YYYY-MM 형식만 월로 읽는다", () => {
    expect(parseMonth("2026-10")).toEqual({ year: 2026, month: 10 });
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("10월")).toBeNull();
    expect(formatMonth(2026, 3)).toBe("2026-03");
  });

  test("오늘 날짜는 서울 시간 기준이다(UTC 15:30은 서울 다음 날 00:30)", () => {
    expect(todayInSeoul(new Date("2026-10-28T15:30:00Z"))).toBe("2026-10-29");
  });
});
