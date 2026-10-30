import { describe, expect, test } from "vitest";

import { activeNamesOn, checkName, checkRemoval, currentNames, isActiveInAny, isActiveOn, isCurrent } from "./tenure";
import type { Member } from "./types";

const members: Member[] = [
  { id: 1, name: "양ㅇㅇ", start: null, removedOn: null },
  { id: 2, name: "홍ㅇㅇ", start: null, removedOn: "2026-10-20" },
  { id: 3, name: "이ㅇㅇ", start: "2026-10-15", removedOn: null },
];

describe("날짜별 재직 기준", () => {
  test("시작일 당일은 재직이고 제거일 당일은 재직이 아니다", () => {
    expect(isActiveOn(members[1], "2026-10-19")).toBe(true);
    expect(isActiveOn(members[1], "2026-10-20")).toBe(false);
    expect(isActiveOn(members[2], "2026-10-14")).toBe(false);
    expect(isActiveOn(members[2], "2026-10-15")).toBe(true);
  });

  test("시작일과 제거일이 없으면 언제나 재직 중이다", () => {
    expect(isActiveOn(members[0], "2020-01-01")).toBe(true);
    expect(isActiveOn(members[0], "2040-01-01")).toBe(true);
  });

  test("그 달에 하루라도 재직하면 현황표 행이 된다", () => {
    const october = ["2026-10-01", "2026-10-19", "2026-10-20"];
    const november = ["2026-11-02", "2026-11-03"];
    expect(isActiveInAny(members[1], october)).toBe(true);
    expect(isActiveInAny(members[1], november)).toBe(false);
  });

  test("날짜별 재직 명단은 표시 순서를 지키고, 10/20부터 한 명 줄어든다", () => {
    expect(activeNamesOn(members, "2026-10-14")).toEqual(["양ㅇㅇ", "홍ㅇㅇ"]);
    expect(activeNamesOn(members, "2026-10-19")).toEqual(["양ㅇㅇ", "홍ㅇㅇ", "이ㅇㅇ"]);
    expect(activeNamesOn(members, "2026-10-20")).toEqual(["양ㅇㅇ", "이ㅇㅇ"]);
  });

  test("제거일이 아직 오지 않았으면 현재 팀원이다(JSON 반영 명단)", () => {
    expect(isCurrent(members[1], "2026-10-19")).toBe(true);
    expect(currentNames(members, "2026-10-20")).toEqual(["양ㅇㅇ", "이ㅇㅇ"]);
  });
});

describe("이름과 제거일 검사", () => {
  test("앞뒤 공백을 지우고, 비었거나 다른 팀원과 같으면 거절한다", () => {
    expect(checkName("  신ㅇㅇ ", ["양ㅇㅇ"])).toEqual({ ok: true, name: "신ㅇㅇ" });
    expect(checkName("   ", [])).toMatchObject({ ok: false });
    const duplicate = checkName("홍ㅇㅇ", ["양ㅇㅇ", "홍ㅇㅇ"]);
    expect(duplicate).toMatchObject({ ok: false });
    expect(duplicate.ok === false && duplicate.error).toContain("이미 있습니다");
  });

  test("제거일은 날짜여야 하고 시작일보다 뒤여야 한다", () => {
    expect(checkRemoval(members[0], "2026-10-20")).toEqual({ ok: true, removedOn: "2026-10-20" });
    expect(checkRemoval(members[0], "내일")).toMatchObject({ ok: false });
    expect(checkRemoval(members[2], "2026-10-15")).toMatchObject({ ok: false });
  });
});
