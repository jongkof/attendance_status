import { weekdayLabel } from "./calendar";
import type { AttendanceRecord } from "./types";

/** "반차 오전", "반반차 오후2"처럼 유형과 구간을 합친 표시. */
export function describeRecord(record: Pick<AttendanceRecord, "type" | "period">): string {
  return record.period ? `${record.type} ${record.period}` : record.type;
}

/** "2026-10-26" → "10/26(월)" */
export function shortDate(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(8, 10)}(${weekdayLabel(date)})`;
}
