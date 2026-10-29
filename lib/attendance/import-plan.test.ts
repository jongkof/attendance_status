import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { planImport } from "./import-plan";
import type { AttendanceRecord } from "./types";

const ROSTER = [
  "양ㅇㅇ", "홍ㅇㅇ", "이ㅇㅇ", "김ㅇㅇ", "박ㅇㅇ", "곽ㅇㅇ",
  "최ㅇㅇ", "임ㅇㅇ", "김ㅇㅇ2", "이ㅇㅇ2", "심ㅇㅇ", "최ㅇㅇ2",
  "이ㅇㅇ3", "장ㅇㅇ", "오ㅇㅇ", "유ㅇㅇ", "김ㅇㅇ3", "강ㅇㅇ",
  "한ㅇㅇ", "류ㅇㅇ", "김ㅇㅇ4", "윤ㅇㅇ",
];

function json(...records: object[]) {
  return JSON.stringify({ records });
}

function record(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "홍ㅇㅇ",
    type: "휴가",
    start: "2026-10-26",
    end: "2026-10-26",
    period: null,
    time: null,
    note: null,
    receivedAt: "2026-10-26T07:00:00+09:00",
    ...overrides,
  };
}

function plan(text: string, existing: AttendanceRecord[] = []) {
  return planImport(text, { roster: ROSTER, existing });
}

function okPlan(text: string, existing: AttendanceRecord[] = []) {
  const result = plan(text, existing);
  if (!result.ok) throw new Error(`계획 실패: ${result.error}`);
  return result;
}

describe("근태 JSON 형식 검사", () => {
  test("JSON이 아닌 글자는 오류로 알리고 아무 변경도 만들지 않는다", () => {
    const result = plan("안녕하세요");
    expect(result.ok).toBe(false);
  });

  test("records 배열이 없으면 오류로 알린다", () => {
    const result = plan(JSON.stringify({ generatedAt: "2026-10-29T13:05:00+09:00" }));
    expect(result.ok).toBe(false);
  });

  test("근태 유형이 8가지가 아니면 그 레코드만 오류가 되고 나머지는 계획에 남는다", () => {
    const result = okPlan(
      json(record({ name: "홍ㅇㅇ", type: "연차" }), record({ name: "이ㅇㅇ", type: "리모트" })),
    );
    expect(result.issues).toEqual([
      expect.objectContaining({ index: 0, name: "홍ㅇㅇ", kind: "invalid" }),
    ]);
    expect(result.changes.map((c) => c.next.name)).toEqual(["이ㅇㅇ"]);
  });

  test("시작일이 종료일보다 늦으면 오류가 된다", () => {
    const result = okPlan(json(record({ start: "2026-10-27", end: "2026-10-26" })));
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].kind).toBe("invalid");
    expect(result.changes).toEqual([]);
  });

  test("필수 값(이름, 날짜, 수신 시각)이 없거나 달력에 없는 날짜면 오류가 된다", () => {
    const result = okPlan(
      json(
        record({ name: "" }),
        record({ start: "2026-02-30", end: "2026-02-30" }),
        record({ receivedAt: "어제" }),
      ),
    );
    expect(result.issues.map((i) => i.kind)).toEqual(["invalid", "invalid", "invalid"]);
    expect(result.changes).toEqual([]);
  });

  test("명단에 없는 이름은 경고로 알리고 반영 대상에서 뺀다", () => {
    const result = okPlan(json(record({ name: "홍길동" }), record({ name: "이ㅇㅇ" })));
    expect(result.issues).toEqual([
      expect.objectContaining({ index: 0, name: "홍길동", kind: "unknown-name" }),
    ]);
    expect(result.changes.map((c) => c.next.name)).toEqual(["이ㅇㅇ"]);
  });
});

describe("기간 근태 펼치기", () => {
  test("기간은 평일(월–금)마다 하나의 근태 기록이 되고 주말은 건너뛴다", () => {
    // 2026-10-30(금) ~ 2026-11-03(화): 금, (토, 일), 월, 화
    const result = okPlan(json(record({ type: "교육", start: "2026-10-30", end: "2026-11-03" })));
    expect(result.changes.map((c) => c.next.date)).toEqual([
      "2026-10-30",
      "2026-11-02",
      "2026-11-03",
    ]);
  });

  test("주말만 있는 기간은 근무일이 없다는 오류가 된다", () => {
    const result = okPlan(json(record({ start: "2026-10-31", end: "2026-11-01" })));
    expect(result.issues).toEqual([expect.objectContaining({ kind: "invalid" })]);
    expect(result.changes).toEqual([]);
  });

  test("period, time, note는 비어 있으면 null로 다룬다", () => {
    const { period, time, note, ...rest } = record();
    void period;
    void time;
    void note;
    const result = okPlan(json(rest));
    expect(result.changes[0].next).toMatchObject({ period: null, time: null, note: null });
  });
});

describe("저장된 기록과의 비교", () => {
  const stored: AttendanceRecord = {
    name: "윤ㅇㅇ",
    date: "2026-10-26",
    type: "휴가",
    period: null,
    time: null,
    note: "병원 진료로 개인휴가",
    receivedAt: "2026-10-26T07:30:00+09:00",
  };

  function statusOf(overrides: Partial<Record<string, unknown>>) {
    const result = okPlan(json(record({ name: "윤ㅇㅇ", ...overrides })), [stored]);
    return result.changes[0];
  }

  test("저장된 기록이 없는 칸은 새로 생기는 칸이다", () => {
    const result = okPlan(json(record({ name: "윤ㅇㅇ" })));
    expect(result.changes[0]).toMatchObject({ status: "new", previous: null });
  });

  test("수신 시각이 더 늦은 공지는 기존 값을 바꾸고 이전 값을 함께 보여 준다", () => {
    const change = statusOf({
      type: "출근",
      note: null,
      receivedAt: "2026-10-26T08:05:00+09:00",
    });
    expect(change.status).toBe("changed");
    expect(change.previous).toEqual(stored);
    expect(change.next.type).toBe("출근");
  });

  test("수신 시각이 더 이른 공지는 입력 순서와 상관없이 건너뛴다", () => {
    const change = statusOf({ type: "리모트", receivedAt: "2026-10-25T20:00:00+09:00" });
    expect(change.status).toBe("skipped");
    expect(change.previous).toEqual(stored);
  });

  test("저장된 기록과 내용이 같으면 변화 없음이다(같은 JSON을 다시 넣어도 동일)", () => {
    const change = statusOf({
      type: "휴가",
      note: "병원 진료로 개인휴가",
      receivedAt: "2026-10-26T07:30:00+09:00",
    });
    expect(change.status).toBe("unchanged");
  });

  test("수신 시각이 같고 내용이 다르면 새 공지로 바꾼다", () => {
    const change = statusOf({
      type: "반차",
      period: "오전",
      note: null,
      receivedAt: "2026-10-26T07:30:00+09:00",
    });
    expect(change.status).toBe("changed");
  });

  test("수신 시각의 표기(시간대)가 달라도 같은 순간이면 같은 시각으로 비교한다", () => {
    const change = statusOf({
      type: "휴가",
      note: "병원 진료로 개인휴가",
      receivedAt: "2026-10-25T22:30:00Z",
    });
    expect(change.status).toBe("unchanged");
  });

  test("기간 공지는 날짜별로 따로 비교해 일부 날짜만 바뀔 수 있다", () => {
    const monday: AttendanceRecord = { ...stored, name: "이ㅇㅇ2", date: "2026-10-26", type: "교육", note: null };
    const tuesday: AttendanceRecord = { ...monday, date: "2026-10-27", receivedAt: "2026-10-28T09:00:00+09:00" };
    const result = okPlan(
      json(record({ name: "이ㅇㅇ2", type: "교육", start: "2026-10-26", end: "2026-10-27", receivedAt: "2026-10-26T07:30:00+09:00" })),
      [monday, tuesday],
    );
    expect(result.changes.map((c) => [c.next.date, c.status])).toEqual([
      ["2026-10-26", "unchanged"],
      ["2026-10-27", "skipped"],
    ]);
  });
});

describe("확인 필요 표시", () => {
  test("note에 확인 필요가 들어 있는 기록은 needsCheck로 표시한다", () => {
    const result = okPlan(
      json(record({ note: "휴가 종류 확인 필요" }), record({ name: "이ㅇㅇ", note: "병가" })),
    );
    expect(result.changes.map((c) => c.needsCheck)).toEqual([true, false]);
  });
});

describe("실제 Copilot 출력(10/26 수신분)", () => {
  const sample = readFileSync(
    path.resolve(process.cwd(), "docs/specs/attendance-json-import/sample-2026-10-26.json"),
    "utf8",
  );

  test("빈 상태에서는 오류와 명단 밖 이름이 없고 확인 필요 3건이 표시된다", () => {
    const result = okPlan(sample);
    expect(result.issues).toEqual([]);
    const flagged = result.changes
      .filter((c) => c.needsCheck)
      .map((c) => `${c.next.name} ${c.next.date}`);
    expect(flagged.sort()).toEqual(["김ㅇㅇ2 2026-10-26", "양ㅇㅇ 2026-10-30", "이ㅇㅇ2 2026-10-30"]);
  });

  test("같은 사람·같은 날짜의 수신 시각이 같으면 JSON에서 뒤에 나온 레코드가 이긴다", () => {
    const result = okPlan(sample);
    const jeongsu1030 = result.changes.find(
      (c) => c.next.name === "이ㅇㅇ2" && c.next.date === "2026-10-30",
    );
    expect(jeongsu1030?.next.type).toBe("출장");
  });

  test("이ㅇㅇ2의 기간 교육은 주말을 건너뛰고 달을 넘어서도 이어진다", () => {
    const result = okPlan(sample);
    const dates = result.changes
      .filter((c) => c.next.name === "이ㅇㅇ2" && c.next.type === "교육")
      .map((c) => c.next.date);
    expect(dates).toEqual([
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29",
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06",
      "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13",
      "2026-11-16",
    ]);
  });
});
