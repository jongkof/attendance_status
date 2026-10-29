import "server-only";

import { getRecords, getRoster, getUnconfirmed } from "@/lib/attendance/store";
import { dayMarksFor } from "@/lib/calendar";
import { getCalendarEntries } from "@/lib/calendar/store";
import type { MailInput } from "@/lib/mail";

/** 복귀일을 계산하려면 그 날 이후의 일정이 필요하다. 이만큼 앞의 날짜까지 읽는다. */
const LOOKAHEAD_DAYS = 180;

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * 메일 본문 계산에 넣을 값을 근태와 달력에서 모은다. 두 모듈은 서로 모르므로 여기서 합친다.
 * 근태 비고는 이 지점에서 버려서 본문 계산에 넘기지 않는다.
 */
export async function loadMailInput(date: string, origin: string): Promise<MailInput> {
  const to = addDays(date, LOOKAHEAD_DAYS);
  const [roster, records, unconfirmed, entries] = await Promise.all([
    getRoster(),
    getRecords({ from: date, to }),
    getUnconfirmed({ from: date, to: date }),
    getCalendarEntries({ from: date, to }),
  ]);

  const days = Array.from({ length: LOOKAHEAD_DAYS + 1 }, (_, index) => addDays(date, index));
  const marks = dayMarksFor(days, entries);

  return {
    date,
    roster,
    records: records.map(({ name, date: recordDate, type, period, time }) => ({ name, date: recordDate, type, period, time })),
    unconfirmedNames: unconfirmed.map((mark) => mark.name),
    holiday: marks[date].holiday,
    events: marks[date].events,
    holidayDates: new Set(days.filter((day) => marks[day].holiday)),
    linkUrl: `${origin}/?month=${date.slice(0, 7)}`,
  };
}
