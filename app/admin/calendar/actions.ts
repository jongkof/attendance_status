"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin/auth";
import { checkEntryInput } from "@/lib/calendar";
import { addCalendarEntry, deleteCalendarEntry, updateCalendarEntry, type WriteResult } from "@/lib/calendar/store";

const LOGIN_REQUIRED = "로그인이 필요합니다. 관리자 로그인 후 다시 시도해 주세요.";

type Input = { date: string; kind: string; name: string };

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
}

async function write(run: () => Promise<WriteResult>): Promise<WriteResult> {
  try {
    const result = await run();
    if (result.ok) refresh();
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "저장하지 못했습니다." };
  }
}

/** 휴일 또는 행사를 하나 추가한다. */
export async function addEntry(input: Input): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  const checked = checkEntryInput({ date: String(input?.date ?? ""), kind: String(input?.kind ?? ""), name: String(input?.name ?? "") });
  if (!checked.ok) return checked;
  return write(() => addCalendarEntry(checked.value));
}

/** 저장된 항목의 날짜, 종류, 이름을 고친다. */
export async function updateEntry(id: number, input: Input): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  if (!Number.isInteger(id)) return { ok: false, error: "항목을 찾지 못했습니다." };
  const checked = checkEntryInput({ date: String(input?.date ?? ""), kind: String(input?.kind ?? ""), name: String(input?.name ?? "") });
  if (!checked.ok) return checked;
  return write(() => updateCalendarEntry(id, checked.value));
}

export async function removeEntry(id: number): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  if (!Number.isInteger(id)) return { ok: false, error: "항목을 찾지 못했습니다." };
  return write(() => deleteCalendarEntry(id));
}
