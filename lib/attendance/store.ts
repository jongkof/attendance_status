import "server-only";

import { supabaseAdmin as supabase } from "@/lib/supabase/server";
import { checkCanMarkUnconfirmed } from "./unconfirmed";
import type { AttendanceChange, AttendanceRecord, UnconfirmedMark } from "./types";

const PAGE_SIZE = 1000;

type MemberRow = { id: number; name: string };

type RecordRow = {
  work_date: string;
  type: AttendanceRecord["type"];
  period: string | null;
  time_range: string | null;
  note: string | null;
  received_at: string;
  members: { name: string } | null;
};

/** 표시 순서대로 정렬된 팀원 명단. */
export async function getRoster(): Promise<string[]> {
  const { data, error } = await supabase()
    .from("members")
    .select("id, name")
    .order("sort_order")
    .overrideTypes<MemberRow[]>();
  if (error) throw new Error(`명단을 읽지 못했습니다: ${error.message}`);
  return data.map((member) => member.name);
}

function toRecord(row: RecordRow): AttendanceRecord {
  return {
    name: row.members?.name ?? "",
    date: row.work_date,
    type: row.type,
    period: row.period,
    time: row.time_range,
    note: row.note,
    receivedAt: row.received_at,
  };
}

/** 저장된 근태 기록. 기간을 주면 그 사이(양 끝 포함)만 읽는다. */
export async function getRecords(range?: { from: string; to: string }): Promise<AttendanceRecord[]> {
  const client = supabase();
  const records: AttendanceRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = client
      .from("attendance_records")
      .select("work_date, type, period, time_range, note, received_at, members(name)")
      .order("work_date")
      .order("member_id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (range) query = query.gte("work_date", range.from).lte("work_date", range.to);
    const { data, error } = await query.overrideTypes<RecordRow[]>();
    if (error) throw new Error(`근태 기록을 읽지 못했습니다: ${error.message}`);
    records.push(...data.map(toRecord));
    if (data.length < PAGE_SIZE) return records;
  }
}

/** 바뀌는 칸을 한 트랜잭션으로 저장한다. 교체되는 이전 값은 이력으로 옮겨진다. */
export async function saveChanges(changes: readonly AttendanceChange[]): Promise<number> {
  if (changes.length === 0) return 0;
  const client = supabase();

  const { data: members, error: memberError } = await client
    .from("members")
    .select("id, name")
    .overrideTypes<MemberRow[]>();
  if (memberError) throw new Error(`명단을 읽지 못했습니다: ${memberError.message}`);
  const idByName = new Map(members.map((member) => [member.name, member.id]));

  const rows = changes.map(({ next }) => {
    const memberId = idByName.get(next.name);
    if (memberId === undefined) throw new Error(`명단에 없는 이름입니다: ${next.name}`);
    return {
      member_id: memberId,
      work_date: next.date,
      type: next.type,
      period: next.period,
      time_range: next.time,
      note: next.note,
      received_at: next.receivedAt,
    };
  });

  const { data, error } = await client.rpc("apply_attendance_changes", { changes: rows });
  if (error) throw new Error(`근태를 저장하지 못했습니다: ${error.message}`);
  return data as number;
}

type MarkRow = { work_date: string; members: { name: string } | null };

/** 미확인(?)으로 표시된 칸. 기간을 주면 그 사이(양 끝 포함)만 읽는다. */
export async function getUnconfirmed(range?: { from: string; to: string }): Promise<UnconfirmedMark[]> {
  let query = supabase().from("unconfirmed_marks").select("work_date, members(name)").order("work_date");
  if (range) query = query.gte("work_date", range.from).lte("work_date", range.to);
  const { data, error } = await query.overrideTypes<MarkRow[]>();
  if (error) throw new Error(`미확인 표시를 읽지 못했습니다: ${error.message}`);
  return data.map((row) => ({ name: row.members?.name ?? "", date: row.work_date }));
}

/** 현황표 한 장(명단, 근태 기록, 미확인 표시)을 그리는 데 필요한 값. */
export async function getMonthView(range: { from: string; to: string }) {
  const [roster, records, unconfirmed] = await Promise.all([getRoster(), getRecords(range), getUnconfirmed(range)]);
  return { roster, records, unconfirmed };
}

export type ToggleResult = { ok: true; marked: boolean } | { ok: false; error: string };

/**
 * 일정 없는 칸의 미확인(?)을 켜고 끈다. 켤 때만 규칙을 검사한다(끄는 것은 언제나 가능).
 * today는 서울 시간 기준 오늘 날짜(YYYY-MM-DD)다.
 */
export async function toggleUnconfirmed(name: string, date: string, today: string): Promise<ToggleResult> {
  const client = supabase();
  // 명단, 미확인 표시, 근태 기록을 한 번에 조회한다(서로 기다릴 필요가 없다).
  const [member, mark, record] = await Promise.all([
    client.from("members").select("id").eq("name", name).maybeSingle<{ id: number }>(),
    client
      .from("unconfirmed_marks")
      .select("work_date, members!inner(name)", { count: "exact", head: true })
      .eq("work_date", date)
      .eq("members.name", name),
    client
      .from("attendance_records")
      .select("work_date, members!inner(name)", { count: "exact", head: true })
      .eq("work_date", date)
      .eq("members.name", name),
  ]);
  if (member.error) return { ok: false, error: `명단을 읽지 못했습니다: ${member.error.message}` };
  if (!member.data) return { ok: false, error: "팀원 명단에 없는 이름입니다." };
  if (mark.error) return { ok: false, error: `미확인 표시를 읽지 못했습니다: ${mark.error.message}` };
  if (record.error) return { ok: false, error: `근태 기록을 읽지 못했습니다: ${record.error.message}` };

  if (!mark.count) {
    const check = checkCanMarkUnconfirmed({ date, today, hasRecord: !!record.count });
    if (!check.ok) return { ok: false, error: check.reason };
  }

  const { data, error } = await client.rpc("toggle_unconfirmed", { p_member_id: member.data.id, p_work_date: date });
  if (error) return { ok: false, error: `미확인 표시를 바꾸지 못했습니다: ${error.message}` };
  return { ok: true, marked: data as boolean };
}
