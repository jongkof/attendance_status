import { describe, expect, test } from "vitest";

import { checkEntryInput } from "./validate";

describe("달력 항목 입력 검사", () => {
  test("날짜, 종류, 이름이 맞으면 이름의 앞뒤 공백을 지운 값을 돌려준다", () => {
    expect(checkEntryInput({ date: "2026-11-13", kind: "holiday", name: "  임시 휴일 " })).toEqual({
      ok: true,
      value: { date: "2026-11-13", kind: "holiday", name: "임시 휴일" },
    });
    expect(checkEntryInput({ date: "2026-10-22", kind: "event", name: "야유회" }).ok).toBe(true);
  });

  test("날짜가 비어 있거나 형식이 맞지 않거나 달력에 없으면 이유와 함께 거절한다", () => {
    for (const date of ["", "2026-13-01", "2026-02-30", "26-10-22", "2026/10/22", "내일"]) {
      const result = checkEntryInput({ date, kind: "holiday", name: "휴일" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("날짜");
    }
  });

  test("이름이 비어 있거나 공백뿐이면 거절한다", () => {
    for (const name of ["", "   "]) {
      const result = checkEntryInput({ date: "2026-10-22", kind: "event", name });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("이름");
    }
  });

  test("종류가 휴일이나 행사가 아니면 거절한다", () => {
    const result = checkEntryInput({ date: "2026-10-22", kind: "meeting", name: "회의" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("종류");
  });
});
