import type { CalendarEntry } from "./types";

/** 저장된 휴일(달력 항목의 휴일)이 하나라도 있으면 그 연도는 등록된 것으로 본다. 규칙 휴일은 저장하지 않으므로 세지 않는다. */
export function hasStoredHoliday(entries: readonly Pick<CalendarEntry, "date" | "kind">[], year: number): boolean {
  const prefix = `${year}-`;
  return entries.some((entry) => entry.kind === "holiday" && entry.date.startsWith(prefix));
}

/** 11월 1일부터 알리는 "내년"(오늘 기준 다음 해). 10월 31일까지는 null. today는 YYYY-MM-DD. */
export function nextYearToWarn(today: string): number | null {
  return Number(today.slice(5, 7)) >= 11 ? Number(today.slice(0, 4)) + 1 : null;
}

export type YearNoticeKind = { kind: "viewed"; year: number } | { kind: "next"; year: number };

/**
 * 안내할 연도 목록. 보고 있는 연도가 미등록이면 그 안내를, 11월부터 내년이 미등록이면 내년 안내를 더한다.
 * 보고 있는 연도가 곧 내년이면 같은 연도를 두 번 알리지 않고 보고 있는 연도 안내만 남긴다.
 */
export function unregisteredYearNotices(
  entries: readonly Pick<CalendarEntry, "date" | "kind">[],
  viewedYear: number,
  today: string,
): YearNoticeKind[] {
  const notices: YearNoticeKind[] = [];
  if (!hasStoredHoliday(entries, viewedYear)) notices.push({ kind: "viewed", year: viewedYear });
  const next = nextYearToWarn(today);
  if (next !== null && next !== viewedYear && !hasStoredHoliday(entries, next)) notices.push({ kind: "next", year: next });
  return notices;
}
