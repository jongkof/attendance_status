const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtc(date: string): Date | null {
  const match = DATE_PATTERN.exec(date);
  if (!match) return null;
  const [, y, m, d] = match;
  const value = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  // 2026-02-30 같은 날짜는 Date가 다음 달로 넘기므로 되돌려 비교한다.
  return value.toISOString().slice(0, 10) === date ? value : null;
}

function format(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function isValidDate(date: string): boolean {
  return toUtc(date) !== null;
}

function isWeekday(value: Date): boolean {
  const day = value.getUTCDay();
  return day !== 0 && day !== 6;
}

/** start부터 end까지(양 끝 포함)의 평일(월–금) 날짜. start > end이면 빈 배열. */
export function weekdaysBetween(start: string, end: string): string[] {
  const from = toUtc(start);
  const to = toUtc(end);
  if (!from || !to) return [];
  const days: string[] = [];
  for (let day = from; day <= to; day = new Date(day.getTime() + 86_400_000)) {
    if (isWeekday(day)) days.push(format(day));
  }
  return days;
}

/** month는 1–12. 그 달의 평일(월–금) 날짜. */
export function weekdaysOfMonth(year: number, month: number): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  return weekdaysBetween(format(first), format(last));
}

/** `YYYY-MM` 형식의 월 값을 읽는다. 형식이 맞지 않으면 null. */
export function parseMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 서울 시간 기준 오늘 날짜(YYYY-MM-DD). */
export function todayInSeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function weekdayLabel(date: string): string {
  const value = toUtc(date);
  return value ? WEEKDAY_LABELS[value.getUTCDay()] : "";
}
