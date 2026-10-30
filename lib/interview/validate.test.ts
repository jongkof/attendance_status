import { describe, expect, test } from "vitest";

import { checkInterviewCell } from "./validate";

const ALWAYS = { start: null, removedOn: null };

describe("면담 칸 규칙", () => {
  test("근무일의 재직 중인 칸은 지난 날짜와 미래 날짜 모두 켤 수 있다", () => {
    expect(checkInterviewCell({ date: "2026-01-05", isHoliday: false, tenure: ALWAYS }).ok).toBe(true);
    expect(checkInterviewCell({ date: "2030-06-12", isHoliday: false, tenure: ALWAYS }).ok).toBe(true);
  });

  test("휴일 칸과 주말은 켤 수 없다", () => {
    expect(checkInterviewCell({ date: "2026-10-09", isHoliday: true, tenure: ALWAYS }).ok).toBe(false);
    expect(checkInterviewCell({ date: "2026-10-10", isHoliday: false, tenure: ALWAYS }).ok).toBe(false);
  });

  test("시작일 전과 제거일 이후의 칸은 켤 수 없고 제거일 전날까지는 켤 수 있다", () => {
    const tenure = { start: "2026-10-15", removedOn: "2026-10-30" };
    expect(checkInterviewCell({ date: "2026-10-14", isHoliday: false, tenure }).ok).toBe(false);
    expect(checkInterviewCell({ date: "2026-10-15", isHoliday: false, tenure }).ok).toBe(true);
    expect(checkInterviewCell({ date: "2026-10-29", isHoliday: false, tenure }).ok).toBe(true);
    expect(checkInterviewCell({ date: "2026-10-30", isHoliday: false, tenure }).ok).toBe(false);
  });

  test("잘못된 날짜는 거절한다", () => {
    expect(checkInterviewCell({ date: "내일", isHoliday: false, tenure: ALWAYS }).ok).toBe(false);
  });
});
