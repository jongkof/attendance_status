import { describe, expect, test } from "vitest";

import { createRemotePlanner, createSkipWeekCheck, ruleForWeek } from "./rotation";
import type { RemoteRule } from "./types";
import { checkRuleInput, checkRuleShape } from "./validate";

const MON_FRI = ["월", "화", "수", "목", "금"];
// 5개 조(1–5)가 기준 주(2026-09-28)에 월·화·수·목·금에서 시작한다. 조1 = 월.
const base: RemoteRule = { from: "2026-09-28", order: MON_FRI, starts: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 } };
const none = new Set<string>();
const holidays2026 = new Set(["2026-10-05", "2026-10-09"]);

function dayOf(rules: RemoteRule[], marked: Set<string>, group: number, week: string) {
  return createRemotePlanner(rules, createSkipWeekCheck(marked), marked).dayOfWeek(group, week);
}

describe("순환 계산", () => {
  test("주마다 한 칸씩 이동하고 끝에 닿으면 처음으로 돌아간다", () => {
    expect(dayOf([base], none, 1, "2026-09-28")).toBe(0);
    expect(dayOf([base], none, 1, "2026-10-05")).toBe(1);
    expect(dayOf([base], none, 5, "2026-10-05")).toBe(0);
    expect(dayOf([base], none, 1, "2026-11-02")).toBe(0);
    expect(dayOf([base], none, 1, "2026-11-09")).toBe(1);
  });

  test("휴일이 있는 주(10/5 주)는 리모트가 없고 순환을 소모하지 않아 10/12 주가 이어진다", () => {
    expect(dayOf([base], holidays2026, 1, "2026-10-05")).toBeNull();
    expect(dayOf([base], holidays2026, 1, "2026-10-12")).toBe(1);
    expect(dayOf([base], holidays2026, 5, "2026-10-12")).toBe(0);
  });

  test("10-19, 10-26, 11-02 주의 이동", () => {
    expect(dayOf([base], holidays2026, 1, "2026-10-19")).toBe(2);
    expect(dayOf([base], holidays2026, 1, "2026-10-26")).toBe(3);
    expect(dayOf([base], holidays2026, 1, "2026-11-02")).toBe(4);
  });

  test("기준 주 이전 주도 같은 패턴으로 거꾸로 계산된다(이전 규칙이 없을 때)", () => {
    expect(dayOf([base], none, 1, "2026-09-21")).toBe(4);
  });

  test("과거 규칙 화→목→수→금과 4개 조", () => {
    const rule: RemoteRule = { from: "2026-09-28", order: ["화", "목", "수", "금"], starts: { 1: 0, 2: 1, 3: 2, 4: 3 } };
    const weeks = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"];
    expect(weeks.map((week) => dayOf([rule], none, 1, week))).toEqual([1, 3, 2, 4, 1]);
  });

  test("요일 순서의 '리모트 없음' 단계에 걸린 조는 그 주에 리모트가 없다", () => {
    const rule: RemoteRule = { from: "2026-09-28", order: [...MON_FRI, "리모트 없음"], starts: { 1: 5 } };
    expect(dayOf([rule], none, 1, "2026-09-28")).toBeNull();
    expect(dayOf([rule], none, 1, "2026-10-05")).toBe(0);
  });

  test("주말에만 걸린 휴일·행사는 영향이 없다", () => {
    const weekendOnly = new Set(["2026-10-03"]);
    expect(dayOf([base], weekendOnly, 1, "2026-09-28")).toBe(0);
    expect(dayOf([base], weekendOnly, 1, "2026-10-05")).toBe(1);
  });

  test("근무일의 행사도 그 주를 리모트 없는 주로 만든다", () => {
    const event = new Set(["2026-10-22"]);
    expect(dayOf([base], event, 1, "2026-10-19")).toBeNull();
    expect(dayOf([base], event, 1, "2026-10-26")).toBe(3);
  });

  test("관리자가 푼 주는 휴일이 있어도 리모트가 계획되고, 푼 주에서도 휴일인 날은 리모트가 아니다", () => {
    const planner = createRemotePlanner([base], createSkipWeekCheck(holidays2026, { "2026-10-05": false }), holidays2026);
    expect(planner.dayOfWeek(1, "2026-10-05")).toBe(1);
    expect(planner.isPlanned(1, "2026-10-06")).toBe(true);
    // 조5는 이 주에 월요일(휴일)이라 리모트하지 않는다
    expect(planner.dayOfWeek(5, "2026-10-05")).toBe(0);
    expect(planner.isPlanned(5, "2026-10-05")).toBe(false);
  });

  test("휴일인 날은 리모트가 아니다", () => {
    const planner = createRemotePlanner([base], () => false, new Set(["2026-09-30"]));
    expect(planner.isPlanned(3, "2026-09-30")).toBe(false);
    expect(planner.isPlanned(4, "2026-10-01")).toBe(true);
  });
});

describe("규칙 선택(적용 결과)", () => {
  const next: RemoteRule = { from: "2026-10-19", order: MON_FRI, starts: { 1: 4 } };

  test("기준 주 이전은 이전 규칙을, 이후는 새 규칙을 쓴다", () => {
    expect(ruleForWeek([base, next], "2026-10-12")).toBe(base);
    expect(ruleForWeek([base, next], "2026-10-19")).toBe(next);
    expect(dayOf([base, next], none, 1, "2026-10-12")).toBe(2);
    expect(dayOf([base, next], none, 1, "2026-10-19")).toBe(4);
  });

  test("첫 규칙보다 앞선 주는 첫 규칙을 쓴다", () => {
    expect(ruleForWeek([base], "2026-01-05")).toBe(base);
    expect(ruleForWeek([], "2026-01-05")).toBeNull();
  });
});

describe("검사", () => {
  test("조 수가 단계 수보다 많거나 단계가 없으면 거절한다", () => {
    expect(checkRuleShape(5, 5).ok).toBe(true);
    expect(checkRuleShape(4, 5)).toEqual({ ok: false, error: expect.stringContaining("조가 5개인데 요일 단계는 4개") });
    expect(checkRuleShape(0, 0)).toEqual({ ok: false, error: expect.stringContaining("단계가 없어") });
  });

  test("규칙 입력의 날짜, 단계, 시작 위치를 확인한다", () => {
    expect(checkRuleInput(base).ok).toBe(true);
    expect(checkRuleInput({ ...base, from: "내일" }).ok).toBe(false);
    expect(checkRuleInput({ ...base, order: ["월", "토"] }).ok).toBe(false);
    expect(checkRuleInput({ ...base, order: ["월", "월"] }).ok).toBe(false);
    expect(checkRuleInput({ ...base, starts: { 1: 9 } }).ok).toBe(false);
  });
});
