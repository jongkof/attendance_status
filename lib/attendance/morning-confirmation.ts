import { isValidDate, weekdaysBetween } from "./calendar";
import type { MarkCheck } from "./unconfirmed";
import type { AttendanceRecord, UnconfirmedMark } from "./types";

/** 리모트로 보이는 칸의 아침 확인 상태. 확인 결과가 없으면 "remote"다. */
export type MorningState = "remote" | "present" | "unconfirmed";

/** 관리자가 저장한 확인 결과(출근 또는 미확인). 리모트로 되돌리면 지워진다. */
export type RemoteConfirmation = {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  result: "present" | "unconfirmed";
};

const NEXT: Record<MorningState, MorningState> = { remote: "present", present: "unconfirmed", unconfirmed: "remote" };

/** 리모트 → 출근 → 미확인(?) → 리모트 */
export function nextMorningState(state: MorningState): MorningState {
  return NEXT[state];
}

/** 아침 확인 토글은 오늘과 지난 근무일의 리모트로 보이는 칸에만 쓸 수 있다. 날짜는 사전순 비교가 날짜순이다. */
export function checkCanConfirmRemote(input: {
  date: string;
  today: string;
  isHoliday: boolean;
  /** 계획된 리모트이거나 근태 기록이 리모트인 칸 */
  isRemoteCell: boolean;
}): MarkCheck {
  const { date, today, isHoliday, isRemoteCell } = input;
  if (!isValidDate(date)) return { ok: false, reason: "올바른 날짜가 아닙니다." };
  if (weekdaysBetween(date, date).length === 0) return { ok: false, reason: "근무일(월–금)이 아닙니다." };
  if (isHoliday) return { ok: false, reason: "휴일 칸은 바꿀 수 없습니다." };
  if (date > today) return { ok: false, reason: "오늘보다 뒤 날짜는 바꿀 수 없습니다." };
  if (!isRemoteCell) return { ok: false, reason: "리모트로 보이는 칸만 아침 확인으로 바꿀 수 있습니다." };
  return { ok: true };
}

/**
 * 확인 결과를 표시용 입력에 반영한다. 근태 기록은 바꾸지 않고 사본만 만든다.
 * 확인 결과는 리모트로 보이는 칸(리모트 기록, 또는 기록·미확인 표시 없는 계획된 리모트)에만 적용된다.
 * 출근으로 확인한 칸은 기록·계획을 빼서 출근이 되고, 미확인으로 확인한 칸은 미확인 표시가 더해진다.
 */
export function applyMorningConfirmations<R extends Pick<AttendanceRecord, "name" | "date" | "type">>(input: {
  records: readonly R[];
  unconfirmed: readonly UnconfirmedMark[];
  /** 계획된 리모트 칸("이름|날짜") */
  planned: readonly string[];
  confirmations: readonly RemoteConfirmation[];
}): { records: R[]; unconfirmed: UnconfirmedMark[]; planned: string[] } {
  const byCell = new Map(input.records.map((record) => [`${record.name}|${record.date}`, record]));
  const marked = new Set(input.unconfirmed.map((mark) => `${mark.name}|${mark.date}`));
  const dropRecords = new Set<string>();
  const dropPlanned = new Set<string>();
  const added: UnconfirmedMark[] = [];

  for (const { name, date, result } of input.confirmations) {
    const key = `${name}|${date}`;
    const record = byCell.get(key);
    if (record) {
      if (record.type !== "리모트") continue;
      dropRecords.add(key);
    } else if (input.planned.includes(key) && !marked.has(key)) {
      dropPlanned.add(key);
    } else continue;
    if (result === "unconfirmed") added.push({ name, date });
  }

  return {
    records: input.records.filter((record) => !dropRecords.has(`${record.name}|${record.date}`)),
    unconfirmed: [...input.unconfirmed, ...added],
    planned: input.planned.filter((key) => !dropPlanned.has(key)),
  };
}
