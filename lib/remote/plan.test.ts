import { describe, expect, test } from "vitest";

import { orderedRoster, planRemoteCells, plannedRemoteCells, rosterBlocks, withoutMembers } from "./plan";
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

describe("재직 기간", () => {
  test("재직 중이 아닌 날에는 리모트를 계획하지 않는다(제거일 당일부터 빠진다)", () => {
    const isMemberOn = (name: string, date: string) => !(name === "홍ㅇㅇ" && date >= "2026-10-20");
    expect([...plannedRemoteCells(setup, days, none, isMemberOn)].sort()).toEqual(
      ["양ㅇㅇ|2026-10-12", "홍ㅇㅇ|2026-10-12", "이ㅇㅇ|2026-10-13", "양ㅇㅇ|2026-10-20", "이ㅇㅇ|2026-10-21"].sort(),
    );
  });

  test("제거한 팀원만 남은 조는 조 수에서 빠지고 조 배정은 지워지지 않는다", () => {
    const current = withoutMembers(setup, (name) => name !== "이ㅇㅇ");
    expect(current.groups.filter((group) => group.members.length > 0).map((group) => group.name)).toEqual(["1조"]);
    expect(setup.groups[1].members).toEqual(["이ㅇㅇ"]);
  });
});

describe("직접 수정과 주 체크", () => {
  const week2 = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"];

  test("직접 추가한 칸이 더해지고 \"리+\" 대상이 되며, 한 주에 두 번도 된다", () => {
    const edited: RemoteSetup = { ...setup, edits: [{ name: "양ㅇㅇ", date: "2026-10-22", kind: "add" }] };
    const { planned, added } = planRemoteCells(edited, week2, none);
    expect(planned.has("양ㅇㅇ|2026-10-20")).toBe(true);
    expect(planned.has("양ㅇㅇ|2026-10-22")).toBe(true);
    expect([...added]).toEqual(["양ㅇㅇ|2026-10-22"]);
  });

  test("직접 해제한 칸은 빠지고, 미배정 팀원도 직접 넣을 수 있다", () => {
    const edited: RemoteSetup = {
      ...setup,
      edits: [
        { name: "양ㅇㅇ", date: "2026-10-20", kind: "remove" },
        { name: "김ㅇㅇ", date: "2026-10-21", kind: "add" },
      ],
    };
    const { planned } = planRemoteCells(edited, week2, none);
    expect(planned.has("양ㅇㅇ|2026-10-20")).toBe(false);
    expect(planned.has("홍ㅇㅇ|2026-10-20")).toBe(true);
    expect(planned.has("김ㅇㅇ|2026-10-21")).toBe(true);
  });

  test("체크한 주는 리모트가 없고 순환을 소모하지 않아 뒤 일정이 밀린다", () => {
    const skipped: RemoteSetup = { ...setup, skipWeeks: { "2026-10-19": true } };
    expect(plannedRemoteCells(skipped, week2, none).size).toBe(0);
    // 10/12 주가 월(조1)·화(조2)였으므로, 건너뛴 다음 주(10/26)는 조1 화요일·조2 수요일로 이어진다.
    expect(plannedRemoteCells(skipped, ["2026-10-26", "2026-10-27", "2026-10-28"], none)).toEqual(
      new Set(["양ㅇㅇ|2026-10-27", "홍ㅇㅇ|2026-10-27", "이ㅇㅇ|2026-10-28"]),
    );
  });

  test("체크한 주의 직접 추가는 보이지 않고, 푼 휴일·행사 주는 자동 건너뜀보다 우선해 순환을 소모한다", () => {
    const event = { marked: new Set(["2026-10-21"]), holidays: new Set<string>() };
    const unlocked: RemoteSetup = { ...setup, skipWeeks: { "2026-10-19": false } };
    expect(plannedRemoteCells(unlocked, ["2026-10-19", "2026-10-20"], event)).toEqual(
      new Set(["양ㅇㅇ|2026-10-20", "홍ㅇㅇ|2026-10-20"]),
    );
    const skippedWithAdd: RemoteSetup = {
      ...setup,
      skipWeeks: { "2026-10-19": true },
      edits: [{ name: "양ㅇㅇ", date: "2026-10-22", kind: "add" }],
    };
    expect(plannedRemoteCells(skippedWithAdd, week2, none).size).toBe(0);
  });

  test("규칙을 바꿔도 직접 수정과 푼 주가 남는다", () => {
    const reapplied: RemoteSetup = {
      ...setup,
      rules: [{ from: "2026-10-19", order: ["금", "월", "화", "수", "목"], starts: { "1": 0, "2": 1 } }],
      edits: [{ name: "양ㅇㅇ", date: "2026-10-22", kind: "add" }],
      skipWeeks: { "2026-10-26": false },
    };
    const event = { marked: new Set(["2026-10-27"]), holidays: new Set<string>() };
    const cells = plannedRemoteCells(reapplied, [...week2, "2026-10-26"], event);
    expect(cells.has("양ㅇㅇ|2026-10-22")).toBe(true);
    expect([...cells].some((cell) => cell.endsWith("2026-10-26"))).toBe(true);
  });
});
