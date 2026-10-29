import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

import { ruleHolidays } from "./rules";
import type { CalendarEntry, EntryKind } from "./types";
import type { EntryInput } from "./validate";

type EntryRow = { id: number; entry_date: string; kind: EntryKind; name: string };

const COLUMNS = "id, entry_date, kind, name";

function toEntry(row: EntryRow): CalendarEntry {
  return { id: row.id, date: row.entry_date, kind: row.kind, name: row.name };
}

/** 저장된 달력 항목(휴일·행사). 기간을 주면 그 사이(양 끝 포함)만 날짜순으로 읽는다. */
export async function getCalendarEntries(range?: { from: string; to: string }): Promise<CalendarEntry[]> {
  let query = supabaseAdmin().from("calendar_entries").select(COLUMNS).order("entry_date").order("kind");
  if (range) query = query.gte("entry_date", range.from).lte("entry_date", range.to);
  const { data, error } = await query.overrideTypes<EntryRow[]>();
  if (error) throw new Error(`달력 항목을 읽지 못했습니다: ${error.message}`);
  return data.map(toEntry);
}

/** 규칙 휴일이거나 저장된 휴일이 있는 날인지. */
export async function isHolidayDate(date: string): Promise<boolean> {
  if (ruleHolidays(Number(date.slice(0, 4))).some((rule) => rule.date === date)) return true;
  const { count, error } = await supabaseAdmin()
    .from("calendar_entries")
    .select("id", { count: "exact", head: true })
    .eq("entry_date", date)
    .eq("kind", "holiday");
  if (error) throw new Error(`달력 항목을 읽지 못했습니다: ${error.message}`);
  return (count ?? 0) > 0;
}

export type WriteResult = { ok: true } | { ok: false; error: string };

const DUPLICATE = "같은 날짜에 같은 종류의 항목이 이미 있습니다.";
const UNIQUE_VIOLATION = "23505";

export async function addCalendarEntry(input: EntryInput): Promise<WriteResult> {
  const { error } = await supabaseAdmin()
    .from("calendar_entries")
    .insert({ entry_date: input.date, kind: input.kind, name: input.name });
  if (error) return { ok: false, error: error.code === UNIQUE_VIOLATION ? DUPLICATE : `저장하지 못했습니다: ${error.message}` };
  return { ok: true };
}

export async function updateCalendarEntry(id: number, input: EntryInput): Promise<WriteResult> {
  const { data, error } = await supabaseAdmin()
    .from("calendar_entries")
    .update({ entry_date: input.date, kind: input.kind, name: input.name })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.code === UNIQUE_VIOLATION ? DUPLICATE : `저장하지 못했습니다: ${error.message}` };
  if (data.length === 0) return { ok: false, error: "항목을 찾지 못했습니다. 이미 지워졌을 수 있습니다." };
  return { ok: true };
}

export async function deleteCalendarEntry(id: number): Promise<WriteResult> {
  const { data, error } = await supabaseAdmin().from("calendar_entries").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: `지우지 못했습니다: ${error.message}` };
  if (data.length === 0) return { ok: false, error: "항목을 찾지 못했습니다. 이미 지워졌을 수 있습니다." };
  return { ok: true };
}
