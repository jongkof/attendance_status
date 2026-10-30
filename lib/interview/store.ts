import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

import type { InterviewMark } from "./types";

type Row = { work_date: string; members: { name: string } | null };

/** 면담이 켜진 칸. 기간을 주면 그 사이(양 끝 포함)만 읽는다. */
export async function getInterviews(range?: { from: string; to: string }): Promise<InterviewMark[]> {
  let query = supabaseAdmin().from("interview_marks").select("work_date, members(name)").order("work_date");
  if (range) query = query.gte("work_date", range.from).lte("work_date", range.to);
  const { data, error } = await query.overrideTypes<Row[]>();
  if (error) throw new Error(`면담 표시를 읽지 못했습니다: ${error.message}`);
  return data.map((row) => ({ name: row.members?.name ?? "", date: row.work_date }));
}

export type WriteResult = { ok: true } | { ok: false; error: string };

/** 한 칸의 면담을 켜거나(true) 끈다(false). 호출한 쪽이 팀원 번호를 이미 알면 넘겨서 조회 한 번을 줄인다. */
export async function setInterview(name: string, date: string, on: boolean, knownMemberId?: number): Promise<WriteResult> {
  const client = supabaseAdmin();
  let memberId = knownMemberId;
  if (memberId === undefined) {
    const member = await client.from("members").select("id").eq("name", name).maybeSingle<{ id: number }>();
    if (member.error) return { ok: false, error: `명단을 읽지 못했습니다: ${member.error.message}` };
    if (!member.data) return { ok: false, error: "팀원 명단에 없는 이름입니다." };
    memberId = member.data.id;
  }
  const { error } = on
    ? await client.from("interview_marks").upsert({ member_id: memberId, work_date: date })
    : await client.from("interview_marks").delete().eq("member_id", memberId).eq("work_date", date);
  if (error) return { ok: false, error: `면담을 바꾸지 못했습니다: ${error.message}` };
  return { ok: true };
}
