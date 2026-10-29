import "server-only";

import { getMonthView } from "@/lib/attendance/store";
import { dayMarksFor } from "@/lib/calendar";
import { getCalendarEntries } from "@/lib/calendar/store";

/** 현황표 한 달치를 그리는 데 필요한 값(명단, 근태 기록, 미확인 표시, 날짜별 휴일·행사 표시). */
export async function loadMonth(days: readonly string[]) {
  const range = { from: days[0], to: days[days.length - 1] };
  const [view, entries] = await Promise.all([getMonthView(range), getCalendarEntries(range)]);
  return { ...view, dayMarks: dayMarksFor(days, entries) };
}
