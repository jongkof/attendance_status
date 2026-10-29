import { describe, expect, test } from "vitest";

import { summarizeDay } from "./summary";

const roster = ["양ㅇㅇ", "홍ㅇㅇ", "이ㅇㅇ", "김ㅇㅇ", "박ㅇㅇ", "최ㅇㅇ"];
const rec = (name: string, type: "리모트" | "휴가" | "반차" | "출근", period: string | null = null) => ({ name, type, period });

describe("날짜 하나의 집계", () => {
  test("계획된 리모트가 리모트에 세어지고 합은 명단 인원수와 같다", () => {
    const result = summarizeDay(roster, [rec("이ㅇㅇ", "휴가"), rec("김ㅇㅇ", "반차", "오전")], ["박ㅇㅇ"], ["양ㅇㅇ", "홍ㅇㅇ"]);
    expect(result).toEqual({ remote: 2, present: 1, absent: 1, morningHalf: 1, unconfirmed: 1 });
    expect(Object.values(result).reduce((sum, value) => sum + value, 0)).toBe(roster.length);
  });

  test("공지 리모트 기록과 계획이 겹치면 한 번만 센다", () => {
    expect(summarizeDay(roster, [rec("양ㅇㅇ", "리모트")], [], ["양ㅇㅇ"]).remote).toBe(1);
  });

  test("휴가 같은 기록이 있으면 계획보다 기록이 우선하고, 미확인 표시도 계획보다 우선한다", () => {
    const result = summarizeDay(roster, [rec("양ㅇㅇ", "휴가")], ["홍ㅇㅇ"], ["양ㅇㅇ", "홍ㅇㅇ"]);
    expect(result.remote).toBe(0);
    expect(result.absent).toBe(1);
    expect(result.unconfirmed).toBe(1);
  });

  test("계획이 없으면 이전과 같다", () => {
    expect(summarizeDay(roster, [rec("양ㅇㅇ", "리모트")], [])).toEqual({ remote: 1, present: 5, absent: 0, morningHalf: 0, unconfirmed: 0 });
  });
});
