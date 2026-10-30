import { describe, expect, test } from "vitest";

import { weekdaysOfMonth } from "@/lib/attendance";
import { dayMarksFor, type CalendarEntry } from "@/lib/calendar";
import type { RosterBlock } from "@/lib/remote";

import { drawTable, interviewCaptureTable, remoteCaptureTable, tableSize, type CaptureTable } from ".";

const days = weekdaysOfMonth(2026, 10);
const entries: CalendarEntry[] = [{ id: 1, date: "2026-10-09", kind: "holiday", name: "한글날" }];
const dayMarks = dayMarksFor(days, entries);
const blocks: RosterBlock[] = [
  { name: null, members: ["곽ㅇㅇ"] },
  { name: "1조", members: ["양ㅇㅇ", "홍ㅇㅇ"] },
];

/** 그린 글자와 칠한 영역을 기록만 하는 가짜 캔버스 */
function recordingContext() {
  const texts: string[] = [];
  const ctx = new Proxy(
    {
      measureText: (text: string) => ({ width: text.length * 6 }),
      fillText: (text: string) => void texts.push(text),
    } as Record<string, unknown>,
    { get: (target, key: string) => target[key] ?? (() => undefined), set: () => true },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

function remote(overrides: Partial<Parameters<typeof remoteCaptureTable>[0]> = {}) {
  return remoteCaptureTable({
    blocks,
    groupIds: [null, 1],
    days,
    dayMarks,
    isSkipWeek: (week) => week === "2026-10-05",
    isPlanned: (_group, name, date) => name === "양ㅇㅇ" && date === "2026-10-13",
    ...overrides,
  });
}

describe("리모트 표 이미지 모양", () => {
  test("제목, 모든 팀원 행, 모든 근무일 열이 들어간다", () => {
    const table = remote();
    expect(table.title).toBe("2026년 10월 리모트 일정");
    expect(table.days).toHaveLength(days.length);
    expect(table.blocks.flatMap((block) => block.rows.map((row) => row.name))).toEqual(["곽ㅇㅇ", "양ㅇㅇ", "홍ㅇㅇ"]);
    for (const row of table.blocks.flatMap((block) => block.rows)) expect(row.cells).toHaveLength(days.length);
  });

  test("리모트 칸은 리 글자, 휴일·리모트 없는 주는 회색, 그 밖은 빈 칸이다", () => {
    const row = remote().blocks[1].rows[0];
    const at = (date: string) => row.cells[days.indexOf(date)];
    expect(at("2026-10-13").text).toBe("리");
    expect(at("2026-10-14").text).toBeUndefined();
    expect(at("2026-10-09").fill).toBeDefined(); // 휴일
    expect(at("2026-10-05").fill).toBe(at("2026-10-09").fill); // 리모트 없는 주도 회색
    expect(at("2026-10-14").fill).toBeUndefined();
  });

  test("직접 고친 리모트도 점 없이 같은 리 칸이다(점을 만드는 필드 자체가 없다)", () => {
    const cell = remote().blocks[1].rows[0].cells[days.indexOf("2026-10-13")];
    expect(Object.keys(cell).sort()).toEqual(["fill", "text", "textColor"]);
  });

  test("리모트 없는 주가 한 줄 배너로 묶이고, 주 경계선은 월요일 열에 붙는다", () => {
    const table = remote();
    const first = days.indexOf("2026-10-05");
    expect(table.bannerWeeks).toEqual([{ first, count: 5 }]);
    expect(table.days.filter((day) => day.weekStart).map((day) => day.weekday)).toEqual(["월", "월", "월", "월"]);
    expect(table.days[0].weekStart).toBe(false);
  });

  test("범례와 휴일 이름이 있다", () => {
    const table = remote();
    expect(table.legend.map((item) => item.label)).toEqual(["리 = 리모트", "회색 = 휴일"]);
    expect(table.days.find((day) => day.date === "2026-10-09")?.holiday).toBe("한글날");
  });

  test("조 id는 블록 순서대로 계획 판정에 넘어간다", () => {
    const seen: (number | null)[] = [];
    remote({ isSkipWeek: () => false, isPlanned: (group) => (seen.push(group), false) });
    expect(new Set(seen)).toEqual(new Set([null, 1]));
  });
});

describe("면담 표 이미지 모양", () => {
  const table = interviewCaptureTable({
    blocks,
    days,
    dayMarks,
    tenures: { 홍ㅇㅇ: { start: "2026-10-12", removedOn: null } },
    isInterview: (name, date) => name === "양ㅇㅇ" && date === "2026-10-13",
  });
  const cellOf = (blockIndex: number, row: number, date: string) => table.blocks[blockIndex].rows[row].cells[days.indexOf(date)];

  test("면담 칸은 플래그, 재직 전 칸은 흐린 소속 아님, 휴일은 회색이다", () => {
    expect(table.title).toBe("2026년 10월 면담 일정");
    expect(cellOf(1, 0, "2026-10-13").flag).toBe(true);
    expect(cellOf(1, 0, "2026-10-14").flag).toBeUndefined();
    expect(cellOf(1, 1, "2026-10-07").faded).toBe(true);
    expect(cellOf(1, 1, "2026-10-13").faded).toBeUndefined();
    expect(cellOf(1, 0, "2026-10-09").fill).toBeDefined();
  });

  test("근태 색 없이 면담·휴일 범례만 있고, 리모트 없음 배너는 없다", () => {
    expect(table.legend.map((item) => item.label)).toEqual(["표시 = 면담", "회색 = 휴일"]);
    expect(table.bannerWeeks).toBeUndefined();
  });
});

describe("표 그리기", () => {
  function draw(table: CaptureTable) {
    const { ctx, texts } = recordingContext();
    drawTable(ctx, table);
    return texts;
  }

  test("제목, 이름, 날짜, 요일, 휴일 이름, 조 이름, 리모트 없음, 범례 글자를 그린다", () => {
    const texts = draw(remote());
    for (const expected of ["2026년 10월 리모트 일정", "곽ㅇㅇ", "양ㅇㅇ", "리", "한글날", "리모트 없음", "리 = 리모트", "회색 = 휴일", "월", "이름"]) {
      expect(texts).toContain(expected);
    }
    expect(texts).toContain("1"); // 조 이름 글자는 한 글자씩 쌓인다
    expect(texts).toContain("조");
  });

  test("체크박스·점·버튼 같은 관리용 글자는 그리지 않는다", () => {
    const texts = draw(remote()).join("|");
    expect(texts).not.toMatch(/이전 달|다음 달|오늘|직접 수정/);
  });

  test("크기는 열과 행 수에 맞고 한 장에 다 들어간다", () => {
    const small = tableSize(remote({ blocks: [blocks[0]], groupIds: [null] }));
    const big = tableSize(remote());
    expect(big.width).toBe(small.width);
    expect(big.height).toBeGreaterThan(small.height);
  });

  test("면담 표 이미지는 같은 그리기 함수로 면담 범례를 그린다", () => {
    const texts = draw(interviewCaptureTable({ blocks, days, dayMarks, tenures: {}, isInterview: () => false }));
    expect(texts).toContain("2026년 10월 면담 일정");
    expect(texts).toContain("표시 = 면담");
  });
});
