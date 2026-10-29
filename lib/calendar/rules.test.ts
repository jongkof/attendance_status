import { describe, expect, test } from "vitest";

import { dayMarksFor } from "./day-marks";
import { ruleHolidays } from "./rules";
import type { CalendarEntry } from "./types";

describe("규칙으로 계산되는 회사 휴일", () => {
  test("근로자의 날(5/1), 회사창립기념일(4월 둘째 금요일), 노조창립기념일(5/30)을 날짜순으로 돌려준다", () => {
    expect(ruleHolidays(2026)).toEqual([
      { date: "2026-04-10", name: "회사창립기념일" },
      { date: "2026-05-01", name: "근로자의 날" },
      { date: "2026-05-30", name: "노조창립기념일" },
    ]);
  });

  test("회사창립기념일은 해마다 4월의 둘째 금요일이다", () => {
    const founding = (year: number) => ruleHolidays(year).find((h) => h.name === "회사창립기념일")?.date;
    expect(founding(2027)).toBe("2027-04-09"); // 4/2가 첫째, 4/9가 둘째 금요일
    expect(founding(2028)).toBe("2028-04-14"); // 4/7이 첫째, 4/14가 둘째 금요일
    expect(founding(2029)).toBe("2029-04-13"); // 4/6이 첫째, 4/13이 둘째 금요일
    expect(founding(2030)).toBe("2030-04-12"); // 4/5가 첫째, 4/12가 둘째 금요일
  });

  test("4월 1일이 금요일인 해에는 4월 1일이 첫째 금요일이라 8일이 둘째 금요일이다", () => {
    expect(ruleHolidays(2022).find((h) => h.name === "회사창립기념일")?.date).toBe("2022-04-08");
  });
});

describe("날짜별 휴일·행사 표시 정보", () => {
  const entries: CalendarEntry[] = [
    { id: 1, date: "2026-10-09", kind: "holiday", name: "한글날" },
    { id: 2, date: "2026-10-22", kind: "event", name: "야유회" },
    { id: 3, date: "2026-10-09", kind: "event", name: "체육대회" },
  ];
  const days = ["2026-10-08", "2026-10-09", "2026-10-22", "2026-10-23"];

  test("휴일 이름과 행사 이름을 날짜별로 모으고, 아무것도 없는 날은 빈 표시를 갖는다", () => {
    const marks = dayMarksFor(days, entries);
    expect(marks["2026-10-08"]).toEqual({ holiday: null, events: [] });
    expect(marks["2026-10-09"]).toEqual({ holiday: "한글날", events: ["체육대회"] });
    expect(marks["2026-10-22"]).toEqual({ holiday: null, events: ["야유회"] });
  });

  test("같은 날 규칙 휴일과 저장된 휴일이 있으면 이름을 모두 보이되 같은 이름은 한 번만 쓴다", () => {
    const marks = dayMarksFor(
      ["2026-05-01", "2026-04-10"],
      [
        { id: 4, date: "2026-05-01", kind: "holiday", name: "노동절" },
        { id: 5, date: "2026-04-10", kind: "holiday", name: "회사창립기념일" },
      ],
    );
    expect(marks["2026-05-01"].holiday).toBe("근로자의 날 · 노동절");
    expect(marks["2026-04-10"].holiday).toBe("회사창립기념일");
  });

  test("달에 걸린 규칙 휴일은 저장된 항목이 없어도 표시된다", () => {
    const marks = dayMarksFor(["2027-04-09", "2027-05-03"], []);
    expect(marks["2027-04-09"].holiday).toBe("회사창립기념일");
    expect(marks["2027-05-03"].holiday).toBeNull();
  });
});
