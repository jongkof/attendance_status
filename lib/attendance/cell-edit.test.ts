import { describe, expect, test } from "vitest";

import { checkCellEdit, type CellChoice } from "./cell-edit";

const base = { date: "2026-11-02", isHoliday: false, isMember: true };
const record = (type: string, period: string | null = null) =>
  ({ kind: "record", type, period }) as CellChoice;

describe("개별 수정 요청 검사", () => {
  test("근무일의 재직 중인 칸은 오늘보다 앞이든 뒤든 고칠 수 있다", () => {
    expect(checkCellEdit({ ...base, choice: record("휴가") }).ok).toBe(true);
    expect(checkCellEdit({ ...base, date: "2027-03-02", choice: record("리모트") }).ok).toBe(true);
    expect(checkCellEdit({ ...base, choice: { kind: "clear" } }).ok).toBe(true);
  });

  test("휴일, 소속 아님, 주말 칸은 고칠 수 없다", () => {
    expect(checkCellEdit({ ...base, isHoliday: true, choice: record("휴가") }).ok).toBe(false);
    expect(checkCellEdit({ ...base, isMember: false, choice: record("휴가") }).ok).toBe(false);
    expect(checkCellEdit({ ...base, date: "2026-11-01", choice: record("휴가") }).ok).toBe(false);
  });

  test("반차와 반반차는 구분이 있어야 저장된다", () => {
    expect(checkCellEdit({ ...base, choice: record("반차") }).ok).toBe(false);
    expect(checkCellEdit({ ...base, choice: record("반차", "오전1") }).ok).toBe(false);
    expect(checkCellEdit({ ...base, choice: record("반차", "오후") }).ok).toBe(true);
    expect(checkCellEdit({ ...base, choice: record("반반차", "오후") }).ok).toBe(false);
    expect(checkCellEdit({ ...base, choice: record("반반차", "오전2") }).ok).toBe(true);
  });

  test("구분이 없는 유형에 구분을 주거나 모르는 유형을 주면 거절한다", () => {
    expect(checkCellEdit({ ...base, choice: record("휴가", "오전") }).ok).toBe(false);
    expect(checkCellEdit({ ...base, choice: record("야근") }).ok).toBe(false);
  });
});
