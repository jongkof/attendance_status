import { describe, expect, it } from "vitest";

import { hasStoredHoliday, nextYearToWarn, unregisteredYearNotices } from "./year-registration";

const holiday = (date: string) => ({ date, kind: "holiday" as const });
const event = (date: string) => ({ date, kind: "event" as const });

describe("hasStoredHoliday", () => {
  it("저장된 휴일이 없으면 미등록이다", () => {
    expect(hasStoredHoliday([], 2031)).toBe(false);
  });
  it("행사와 다른 연도의 휴일은 세지 않는다", () => {
    expect(hasStoredHoliday([event("2031-03-05"), holiday("2030-01-01")], 2031)).toBe(false);
  });
  it("휴일이 한 건이라도 있으면 등록이다", () => {
    expect(hasStoredHoliday([holiday("2031-01-01")], 2031)).toBe(true);
  });
});

describe("nextYearToWarn", () => {
  it("10월 31일까지는 알리지 않는다", () => {
    expect(nextYearToWarn("2030-10-31")).toBeNull();
  });
  it("11월 1일부터 내년을 알린다", () => {
    expect(nextYearToWarn("2030-11-01")).toBe(2031);
    expect(nextYearToWarn("2030-12-31")).toBe(2031);
  });
});

describe("unregisteredYearNotices", () => {
  const entries = [holiday("2030-01-01")];
  it("등록된 연도를 10월에 보면 안내가 없다", () => {
    expect(unregisteredYearNotices(entries, 2030, "2030-10-31")).toEqual([]);
  });
  it("미등록 연도를 보면 그 연도 안내가 나온다", () => {
    expect(unregisteredYearNotices(entries, 2031, "2030-10-31")).toEqual([{ kind: "viewed", year: 2031 }]);
  });
  it("11월에는 보는 연도와 상관없이 내년 안내가 더해진다", () => {
    expect(unregisteredYearNotices(entries, 2030, "2030-11-01")).toEqual([{ kind: "next", year: 2031 }]);
  });
  it("보는 연도가 곧 내년이면 한 번만 알린다", () => {
    expect(unregisteredYearNotices(entries, 2031, "2030-11-01")).toEqual([{ kind: "viewed", year: 2031 }]);
  });
  it("내년이 등록돼 있으면 알리지 않는다", () => {
    expect(unregisteredYearNotices([...entries, holiday("2031-01-01")], 2030, "2030-12-01")).toEqual([]);
  });
});
