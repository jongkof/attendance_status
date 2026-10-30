import { describe, expect, test } from "vitest";

import { focusDayOf, weekdaysOfMonth } from "./calendar";

describe("표를 열 때 보여 줄 열", () => {
  const october = weekdaysOfMonth(2026, 10);

  test("오늘이 근무일이면 오늘 열이다", () => {
    expect(focusDayOf(october, "2026-10-29")).toBe("2026-10-29");
  });

  test("오늘이 토요일이면 금요일 열이다", () => {
    expect(focusDayOf(october, "2026-10-10")).toBe("2026-10-09");
  });

  test("다른 달이면 없다(첫 열부터 보인다)", () => {
    expect(focusDayOf(october, "2026-11-02")).toBeNull();
    expect(focusDayOf(weekdaysOfMonth(2026, 9), "2026-10-29")).toBeNull();
  });

  test("달의 첫 근무일 전의 주말이면 없다", () => {
    expect(focusDayOf(weekdaysOfMonth(2026, 8), "2026-08-01")).toBeNull();
  });
});
