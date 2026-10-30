import type { Member, Tenure } from "./types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const ALWAYS: Tenure = { start: null, removedOn: null };

export function isDate(value: unknown): value is string {
  return typeof value === "string" && DATE.test(value) && !Number.isNaN(Date.parse(value));
}

/** 그 날짜에 재직 중인지. 시작일 당일은 재직이고 제거일 당일은 재직이 아니다. */
export function isActiveOn(tenure: Tenure, date: string): boolean {
  return (tenure.start === null || tenure.start <= date) && (tenure.removedOn === null || date < tenure.removedOn);
}

/** 날짜들 중 하루라도 재직 중인지(현황표 행으로 보일지). */
export function isActiveInAny(tenure: Tenure, days: readonly string[]): boolean {
  return days.some((day) => isActiveOn(tenure, day));
}

/** 제거되지 않은 팀원인지. 제거일이 아직 오지 않았으면 오늘은 재직 중이라 제거된 것이 아니다. */
export function isCurrent(tenure: Tenure, today: string): boolean {
  return tenure.removedOn === null || tenure.removedOn > today;
}

export function tenureOf(members: readonly Member[]): Record<string, Tenure> {
  return Object.fromEntries(members.map((member) => [member.name, { start: member.start, removedOn: member.removedOn }]));
}

/** 그 날짜에 재직 중인 팀원 이름(표시 순서). */
export function activeNamesOn(members: readonly Member[], date: string): string[] {
  return members.filter((member) => isActiveOn(member, date)).map((member) => member.name);
}

/** 제거되지 않은 팀원 이름(표시 순서). */
export function currentNames(members: readonly Member[], today: string): string[] {
  return members.filter((member) => isCurrent(member, today)).map((member) => member.name);
}

export type Check<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** 이름은 앞뒤 공백을 지운 뒤 한 글자 이상이어야 하고, 다른 팀원(제거한 팀원 포함)과 겹치면 안 된다. */
export function checkName(raw: unknown, others: readonly string[]): Check<{ name: string }> {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name === "") return { ok: false, error: "이름을 입력해 주세요." };
  if (others.includes(name)) return { ok: false, error: `"${name}" 이름의 팀원이 이미 있습니다. 같은 이름이면 번호를 붙여 구별해 주세요(예: ${name}2).` };
  return { ok: true, name };
}

/** 제거일은 시작일보다 뒤여야 한다(아니면 한 번도 재직하지 않은 팀원이 된다). */
export function checkRemoval(tenure: Tenure, removedOn: unknown): Check<{ removedOn: string }> {
  if (!isDate(removedOn)) return { ok: false, error: "제거일을 올바른 날짜로 골라 주세요." };
  if (tenure.start !== null && removedOn <= tenure.start) return { ok: false, error: `제거일은 시작일(${tenure.start})보다 뒤여야 합니다.` };
  return { ok: true, removedOn };
}
