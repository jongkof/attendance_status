import { ENTRY_KINDS, type EntryKind } from "./types";

export type EntryInput = { date: string; kind: EntryKind; name: string };

export type EntryCheck = { ok: true; value: EntryInput } | { ok: false; error: string };

function isRealDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return value.toISOString().slice(0, 10) === date;
}

/** 관리자가 입력한 달력 항목을 검사한다. 맞으면 이름의 앞뒤 공백을 지운 값을 돌려준다. */
export function checkEntryInput(input: { date: string; kind: string; name: string }): EntryCheck {
  if (!isRealDate(input.date)) return { ok: false, error: "날짜를 YYYY-MM-DD 형식의 올바른 날짜로 입력해 주세요." };
  if (!ENTRY_KINDS.includes(input.kind as EntryKind)) return { ok: false, error: "종류는 휴일 또는 행사여야 합니다." };
  const name = input.name.trim();
  if (name === "") return { ok: false, error: "이름을 입력해 주세요." };
  return { ok: true, value: { date: input.date, kind: input.kind as EntryKind, name } };
}
