import type { AttendanceRecord } from "./types";

export type DaySummary = {
  remote: number;
  present: number;
  absent: number;
  morningHalf: number;
  unconfirmed: number;
};

const ABSENT = new Set(["휴가", "출장", "교육", "건강검진"]);

/**
 * 근무일 하루의 집계(attendance-summary 결정). records는 그 날의 근태 기록이다.
 * 계획된 리모트(plannedNames)는 기록도 미확인 표시도 없는 사람에게만 적용된다. 5개를 더하면 명단 인원수와 같다.
 */
export function summarizeDay(
  roster: readonly string[],
  records: readonly Pick<AttendanceRecord, "name" | "type" | "period">[],
  unconfirmedNames: readonly string[],
  plannedNames: readonly string[] = [],
): DaySummary {
  const byName = new Map(records.map((record) => [record.name, record]));
  const unconfirmed = new Set(unconfirmedNames);
  const planned = new Set(plannedNames);
  const summary: DaySummary = { remote: 0, present: 0, absent: 0, morningHalf: 0, unconfirmed: 0 };
  for (const name of roster) {
    const record = byName.get(name);
    if (!record && unconfirmed.has(name)) summary.unconfirmed += 1;
    else if (!record) summary[planned.has(name) ? "remote" : "present"] += 1;
    else if (record.type === "리모트") summary.remote += 1;
    else if (ABSENT.has(record.type)) summary.absent += 1;
    else if (record.type === "반차" || record.type === "반반차") {
      summary[record.period?.startsWith("오후") ? "present" : "morningHalf"] += 1;
    } else summary.present += 1;
  }
  return summary;
}
