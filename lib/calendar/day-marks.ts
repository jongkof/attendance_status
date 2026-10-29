import { ruleHolidays } from "./rules";
import type { CalendarEntry, DayMark } from "./types";

/**
 * 표의 날짜 열마다 휴일·행사 표시를 만든다. 규칙 휴일과 저장된 휴일은 이름을 " · "로 잇고,
 * 같은 이름은 한 번만 쓴다. 아무것도 없는 날도 빈 표시를 가진다.
 */
export function dayMarksFor(days: readonly string[], entries: readonly CalendarEntry[]): Record<string, DayMark> {
  const holidayNames = new Map<string, string[]>();
  const eventNames = new Map<string, string[]>();
  const add = (map: Map<string, string[]>, date: string, name: string) => {
    const names = map.get(date) ?? [];
    if (!names.includes(name)) names.push(name);
    map.set(date, names);
  };

  for (const year of new Set(days.map((day) => Number(day.slice(0, 4))))) {
    for (const rule of ruleHolidays(year)) add(holidayNames, rule.date, rule.name);
  }
  for (const entry of entries) {
    add(entry.kind === "holiday" ? holidayNames : eventNames, entry.date, entry.name);
  }

  return Object.fromEntries(
    days.map((day) => [
      day,
      { holiday: holidayNames.get(day)?.join(" · ") ?? null, events: eventNames.get(day) ?? [] } satisfies DayMark,
    ]),
  );
}
