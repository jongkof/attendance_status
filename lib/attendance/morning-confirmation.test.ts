import { describe, expect, test } from "vitest";

import {
  applyMorningConfirmations,
  checkCanConfirmRemote,
  nextMorningState,
  type RemoteConfirmation,
} from "./morning-confirmation";
import { summarizeDay } from "./summary";

const date = "2026-10-29";
const remoteRecord = { name: "홍ㅇㅇ", date, type: "리모트" as const, period: null, time: null, note: null, receivedAt: "2026-10-28T00:00:00Z" };
const vacation = { ...remoteRecord, name: "양ㅇㅇ", type: "휴가" as const };

describe("아침 확인 3단계", () => {
  test("리모트 → 출근 → 미확인 → 리모트 순으로 돈다", () => {
    expect(nextMorningState("remote")).toBe("present");
    expect(nextMorningState("present")).toBe("unconfirmed");
    expect(nextMorningState("unconfirmed")).toBe("remote");
  });
});

describe("토글할 수 있는 리모트 칸", () => {
  const base = { date, today: date, isHoliday: false, isRemoteCell: true };
  test("오늘과 지난 날짜의 리모트 칸은 된다", () => {
    expect(checkCanConfirmRemote(base)).toEqual({ ok: true });
    expect(checkCanConfirmRemote({ ...base, date: "2026-10-28" })).toEqual({ ok: true });
  });
  test("미래, 휴일, 주말, 리모트가 아닌 칸은 거절한다", () => {
    expect(checkCanConfirmRemote({ ...base, date: "2026-10-30" }).ok).toBe(false);
    expect(checkCanConfirmRemote({ ...base, isHoliday: true }).ok).toBe(false);
    expect(checkCanConfirmRemote({ ...base, date: "2026-10-24" }).ok).toBe(false);
    expect(checkCanConfirmRemote({ ...base, isRemoteCell: false }).ok).toBe(false);
  });
});

describe("확인 결과 반영", () => {
  const roster = ["홍ㅇㅇ", "양ㅇㅇ", "김ㅇㅇ"];
  const summarize = (confirmations: RemoteConfirmation[], planned: string[]) => {
    const applied = applyMorningConfirmations({ records: [remoteRecord, vacation], unconfirmed: [], planned, confirmations });
    return summarizeDay(roster, applied.records, applied.unconfirmed.map((m) => m.name), applied.planned.map((c) => c.split("|")[0]));
  };

  test("확인이 없으면 기록 리모트와 계획 리모트가 그대로 리모트다", () => {
    expect(summarize([], [`김ㅇㅇ|${date}`])).toMatchObject({ remote: 2, absent: 1, present: 0, unconfirmed: 0 });
  });

  test("기록 리모트를 출근으로 확인하면 출근, 미확인으로 확인하면 미확인으로 센다", () => {
    expect(summarize([{ name: "홍ㅇㅇ", date, result: "present" }], [])).toMatchObject({ remote: 0, present: 2, absent: 1 });
    const unconfirmed = summarize([{ name: "홍ㅇㅇ", date, result: "unconfirmed" }], []);
    expect(unconfirmed).toMatchObject({ remote: 0, present: 1, unconfirmed: 1 });
  });

  test("계획 리모트도 같고, 합은 명단 인원수와 같다", () => {
    const planned = [`김ㅇㅇ|${date}`];
    for (const result of ["present", "unconfirmed"] as const) {
      const summary = summarize([{ name: "김ㅇㅇ", date, result }], planned);
      expect(summary.remote).toBe(1);
      expect(Object.values(summary).reduce((a, b) => a + b, 0)).toBe(roster.length);
    }
  });

  test("리모트가 아닌 기록 칸의 확인 결과는 무시한다", () => {
    expect(summarize([{ name: "양ㅇㅇ", date, result: "unconfirmed" }], [])).toMatchObject({ absent: 1, unconfirmed: 0 });
  });

  test("근태 기록이 바뀌어도(JSON 재반영) 같은 확인 결과가 그대로 적용된다", () => {
    const confirmations: RemoteConfirmation[] = [{ name: "홍ㅇㅇ", date, result: "present" }];
    const again = { ...remoteRecord, receivedAt: "2026-10-29T07:00:00Z", note: "수정" };
    const applied = applyMorningConfirmations({ records: [again], unconfirmed: [], planned: [], confirmations });
    expect(applied.records).toEqual([]);
  });

  test("원본 입력은 바꾸지 않는다", () => {
    const records = [remoteRecord];
    applyMorningConfirmations({ records, unconfirmed: [], planned: [], confirmations: [{ name: "홍ㅇㅇ", date, result: "present" }] });
    expect(records).toHaveLength(1);
  });
});
