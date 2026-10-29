import { isValidDate, weekdaysBetween } from "./calendar";

export type MarkCheck = { ok: true } | { ok: false; reason: string };

/**
 * 미확인(?)은 일정이 없는 근무일에만 켤 수 있고, 오늘과 지난 날짜만 대상이다.
 * 날짜는 YYYY-MM-DD 문자열이라 사전순 비교가 날짜순 비교와 같다.
 */
export function checkCanMarkUnconfirmed(input: { date: string; today: string; hasRecord: boolean }): MarkCheck {
  const { date, today, hasRecord } = input;
  if (!isValidDate(date)) return { ok: false, reason: "올바른 날짜가 아닙니다." };
  if (weekdaysBetween(date, date).length === 0) return { ok: false, reason: "근무일(월–금)이 아닙니다." };
  if (date > today) return { ok: false, reason: "오늘보다 뒤 날짜는 미확인으로 바꿀 수 없습니다." };
  if (hasRecord) return { ok: false, reason: "근태 공지가 있는 칸은 미확인으로 바꿀 수 없습니다." };
  return { ok: true };
}
