const DAY_MS = 86_400_000;

function toMs(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

function toDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toDate(toMs(date) + days * DAY_MS);
}

/** 월요일 0 … 일요일 6. */
export function weekdayIndex(date: string): number {
  return (new Date(toMs(date)).getUTCDay() + 6) % 7;
}

/** 그 날이 속한 주의 월요일. */
export function mondayOf(date: string): string {
  return addDays(date, -weekdayIndex(date));
}

/** 두 월요일 사이의 주 수(to가 뒤면 양수). */
export function weeksBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / (7 * DAY_MS));
}
