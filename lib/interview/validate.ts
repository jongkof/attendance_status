import { isActiveOn, isDate, type Tenure } from "@/lib/roster";

export type InterviewCheck = { ok: true } | { ok: false; error: string };

/**
 * 면담을 켜거나 끌 수 있는 칸인지 확인한다. 날짜 제한은 없지만 근무일(월–금)이어야 하고,
 * 휴일 칸과 재직 기간이 아닌 칸은 안 된다. 근태 기록이 있는 칸은 괜찮다.
 */
export function checkInterviewCell(input: { date: string; isHoliday: boolean; tenure: Tenure }): InterviewCheck {
  if (!isDate(input.date)) return { ok: false, error: "날짜가 올바르지 않습니다." };
  const weekday = new Date(`${input.date}T00:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return { ok: false, error: "주말은 근무일이 아니라 면담을 지정할 수 없습니다." };
  if (input.isHoliday) return { ok: false, error: "휴일에는 면담을 지정할 수 없습니다." };
  if (!isActiveOn(input.tenure, input.date)) return { ok: false, error: "재직 기간이 아닌 날짜에는 면담을 지정할 수 없습니다." };
  return { ok: true };
}
