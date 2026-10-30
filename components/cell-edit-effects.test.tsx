import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AttendanceTable } from "@/components/attendance-table";
import { planImport, type AttendanceRecord } from "@/lib/attendance";

/** 개별 수정이 저장된 뒤 현황표·집계·JSON 반영 계획에 어떻게 나타나는지 본다(저장소 계층은 쓰지 않는다). */

const day = "2026-11-02";
const manual = (extra: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  name: "양ㅇㅇ",
  date: day,
  type: "휴가",
  period: null,
  time: null,
  note: null,
  receivedAt: "2026-10-30T12:00:00.000Z",
  ...extra,
});

function counts(container: HTMLElement) {
  return Object.fromEntries(
    [...container.querySelectorAll("tfoot tr")].map((row) => [row.querySelector("th")?.textContent, Number(row.querySelector("td")?.textContent)]),
  );
}

function table(props: Partial<React.ComponentProps<typeof AttendanceTable>>) {
  return render(
    <AttendanceTable roster={["양ㅇㅇ", "홍ㅇㅇ"]} days={[day]} records={[]} showSummary today="2026-10-30" {...props} />,
  );
}

describe("개별 수정 뒤의 현황표와 집계", () => {
  test("휴가로 고친 칸은 휴가로 보이고 집계의 부재가 1 늘고 출근이 1 준다", () => {
    const before = table({});
    expect(counts(before.container)).toMatchObject({ 출근: 2, 부재: 0 });
    before.unmount();

    const after = table({ records: [manual()] });
    expect(screen.getByRole("button", { name: /양ㅇㅇ 11\/02\(월\) 휴가/ })).toHaveTextContent("휴");
    expect(counts(after.container)).toMatchObject({ 출근: 1, 부재: 1 });
  });

  test("리모트 계획을 추가하면 리+로 보이고 해제하면 사라진다", () => {
    const added = table({ planned: ["양ㅇㅇ|" + day], added: ["양ㅇㅇ|" + day] });
    expect(screen.getByRole("img", { name: "양ㅇㅇ 2026-11-02 리모트(직접 추가)" })).toHaveTextContent("리+");
    added.unmount();
    table({});
    expect(screen.queryByRole("img", { name: /리모트/ })).toBeNull();
  });

  test("면담을 켜면 모서리 플래그가 보이고 끄면 사라지며 근태 기록은 그대로다", () => {
    const on = table({ records: [manual()], interviews: [{ name: "양ㅇㅇ", date: day }] });
    expect(screen.getByRole("img", { name: "양ㅇㅇ 2026-11-02 면담" })).toBeInTheDocument();
    expect(counts(on.container)).toMatchObject({ 부재: 1 });
    on.unmount();
    const off = table({ records: [manual()] });
    expect(screen.queryByRole("img", { name: /면담/ })).toBeNull();
    expect(counts(off.container)).toMatchObject({ 부재: 1 });
  });

  test("기록을 지우면 일정 없는 칸으로 돌아가고, 계획된 리모트가 있던 칸은 다시 리모트로 보인다", () => {
    const planned = ["양ㅇㅇ|" + day];
    const withRecord = table({ records: [manual()], planned });
    expect(screen.queryByRole("img", { name: /리모트/ })).toBeNull();
    withRecord.unmount();

    const cleared = table({ planned });
    expect(screen.getByRole("img", { name: "양ㅇㅇ 2026-11-02 리모트(계획)" })).toBeInTheDocument();
    expect(counts(cleared.container)).toMatchObject({ 리모트: 1 });
    cleared.unmount();

    table({});
    expect(screen.getByRole("img", { name: "양ㅇㅇ 2026-11-02 출근" })).toBeInTheDocument();
  });
});

describe("직접 수정과 JSON 반영 계획", () => {
  const json = (receivedAt: string) =>
    JSON.stringify({ records: [{ name: "양ㅇㅇ", type: "교육", start: day, end: day, receivedAt }] });
  const statusAt = (receivedAt: string) => {
    const plan = planImport(json(receivedAt), { roster: ["양ㅇㅇ"], existing: [manual()] });
    if (!plan.ok) throw new Error(plan.error);
    return plan.changes[0].status;
  };

  test("수정 시각보다 이른 수신 시각의 JSON은 건너뛰는 항목이다", () => {
    expect(statusAt("2026-10-30T11:59:00.000Z")).toBe("skipped");
  });

  test("수정 시각보다 늦은 수신 시각의 JSON은 그 칸을 덮어쓴다", () => {
    expect(statusAt("2026-10-30T12:01:00.000Z")).toBe("changed");
  });
});

describe("기록 지우기·고치기 SQL 함수", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261031050000_cell_edit.sql"), "utf8");

  test("그 칸의 미확인 표시와 아침 확인 결과를 같은 함수에서 지운다", () => {
    expect(sql).toMatch(/delete from public\.unconfirmed_marks/);
    expect(sql).toMatch(/delete from public\.morning_confirmations/);
  });

  test("type이 null이면 근태 기록을 지우고, 아니면 시간과 비고를 비워 저장한다", () => {
    expect(sql).toMatch(/if p_type is null then\s+delete from public\.attendance_records/);
    expect(sql).toMatch(/time_range = null,\s+note = null/);
  });

  test("바뀌거나 지워지는 이전 기록은 이력으로 옮긴다", () => {
    expect(sql).toMatch(/insert into public\.attendance_history/);
  });
});
