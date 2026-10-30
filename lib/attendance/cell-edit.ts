import { isValidDate, weekdaysBetween } from "./calendar";
import { ATTENDANCE_TYPES, type AttendanceType } from "./types";

/** 반차와 반반차는 구분까지 골라야 저장된다. 다른 유형은 구분이 없다. */
export const CELL_EDIT_PERIODS: Partial<Record<AttendanceType, readonly string[]>> = {
  반차: ["오전", "오후"],
  반반차: ["오전1", "오전2", "오후1", "오후2"],
};

/** 현황표 팝업에서 고르는 것: 근태 유형(구분 포함) 또는 기록 지우기. 시간과 비고는 없다. */
export type CellChoice = { kind: "record"; type: AttendanceType; period: string | null } | { kind: "clear" };

export type CellEditCheck = { ok: true } | { ok: false; error: string };

/**
 * 개별 수정 요청이 올바른지 확인한다. 근무일(월–금)의 재직 중인 팀원 칸만 고칠 수 있고 날짜 제한은 없다.
 * 휴일은 호출하는 쪽이 달력에서, 재직 여부는 명단에서 알아내 넘긴다.
 */
export function checkCellEdit(input: {
  date: string;
  isHoliday: boolean;
  isMember: boolean;
  choice: CellChoice;
}): CellEditCheck {
  const { date, isHoliday, isMember, choice } = input;
  if (!isValidDate(date)) return { ok: false, error: "올바른 날짜가 아닙니다." };
  if (weekdaysBetween(date, date).length === 0) return { ok: false, error: "근무일(월–금)이 아닙니다." };
  if (isHoliday) return { ok: false, error: "휴일 칸은 수정할 수 없습니다." };
  if (!isMember) return { ok: false, error: "재직 기간이 아닌 칸은 수정할 수 없습니다." };
  if (typeof choice !== "object" || choice === null) return { ok: false, error: "요청이 올바르지 않습니다." };
  if (choice.kind === "clear") return { ok: true };
  if (choice.kind !== "record" || !ATTENDANCE_TYPES.includes(choice.type)) {
    return { ok: false, error: "근태 유형이 올바르지 않습니다." };
  }
  const periods = CELL_EDIT_PERIODS[choice.type];
  if (periods) {
    if (!choice.period || !periods.includes(choice.period)) {
      return { ok: false, error: `${choice.type}은(는) 구분(${periods.join("·")})을 골라야 합니다.` };
    }
  } else if (choice.period !== null) {
    return { ok: false, error: `${choice.type}에는 구분이 없습니다.` };
  }
  return { ok: true };
}
