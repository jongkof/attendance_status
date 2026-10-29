import { describe, expect, test } from "vitest";

import { orderedRoster, plannedRemoteCells, rosterBlocks } from "./plan";
import type { RemoteSetup } from "./types";

const setup: RemoteSetup = {
  groups: [
    { id: 1, name: "1조", members: ["양ㅇㅇ", "홍ㅇㅇ"] },
    { id: 2, name: "2조", members: ["이ㅇㅇ"] },
    { id: 3, name: "3조", members: [] },
  ],
  unassigned: ["김ㅇㅇ"],
  rules: [{ from: "2026-10-12", order: ["월", "화", "수", "목", "금"], starts: { "1": 0, "2": 1 } }],
};
const none = { marked: new Set<string>(), holidays: new Set<string>() };
const days = ["2026-10-12", "2026-10-13", "2026-10-20", "2026-10-21"];

describe("조 편성 표시 순서", () => {
  test("미배정이 맨 위에 라벨 없이 오고, 조 순서와 조 안 순서를 따른다(빈 조는 건너뛴다)", () => {
    expect(rosterBlocks(setup)).toEqual([
      { name: null, members: ["김ㅇㅇ"] },
      { name: "1조", members: ["양ㅇㅇ", "홍ㅇㅇ"] },
      { name: "2조", members: ["이ㅇㅇ"] },
    ]);
    expect(orderedRoster(setup)).toEqual(["김ㅇㅇ", "양ㅇㅇ", "홍ㅇㅇ", "이ㅇㅇ"]);
  });

  test("조가 없으면 명단 순서 그대로다", () => {
    expect(orderedRoster({ groups: [], unassigned: ["양ㅇㅇ", "홍ㅇㅇ"], rules: [] })).toEqual(["양ㅇㅇ", "홍ㅇㅇ"]);
  });
});

describe("계획된 리모트 칸", () => {
  test("조 팀원 모두가 그 조의 요일에 채워지고 미배정은 채워지지 않는다", () => {
    expect([...plannedRemoteCells(setup, days, none)].sort()).toEqual(
      ["양ㅇㅇ|2026-10-12", "홍ㅇㅇ|2026-10-12", "이ㅇㅇ|2026-10-13", "양ㅇㅇ|2026-10-20", "홍ㅇㅇ|2026-10-20", "이ㅇㅇ|2026-10-21"].sort(),
    );
  });

  test("휴일인 날은 비고, 근무일에 휴일이 걸린 주는 통째로 없다", () => {
    const holiday = { marked: new Set(["2026-10-12"]), holidays: new Set(["2026-10-12"]) };
    const cells = plannedRemoteCells(setup, days, holiday);
    expect([...cells].some((cell) => cell.endsWith("2026-10-12") || cell.endsWith("2026-10-13"))).toBe(false);
    // 건너뛴 기준 주는 순환을 소모하지 않으므로 다음 주에는 조1이 기준 주 다음 단계(화요일)로 이어진다.
    expect(plannedRemoteCells(setup, ["2026-10-19", "2026-10-20"], holiday)).toEqual(new Set(["양ㅇㅇ|2026-10-20", "홍ㅇㅇ|2026-10-20"]));
  });

  test("행사만 있는 주도 리모트가 없다", () => {
    const event = { marked: new Set(["2026-10-14"]), holidays: new Set<string>() };
    expect(plannedRemoteCells(setup, days.slice(0, 2), event).size).toBe(0);
  });

  test("규칙이 없으면 아무 칸도 채우지 않는다", () => {
    expect(plannedRemoteCells({ ...setup, rules: [] }, days, none).size).toBe(0);
  });
});
