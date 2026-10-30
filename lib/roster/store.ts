import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

import { checkName, checkRemoval, isDate } from "./tenure";
import type { Member } from "./types";

type Row = { id: number; name: string; start_date: string | null; removed_on: string | null };

export type WriteResult = { ok: true } | { ok: false; error: string };

/** 제거한 팀원을 포함한 전체 팀원. 표시 순서(sort_order)대로다. */
export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabaseAdmin()
    .from("members")
    .select("id, name, start_date, removed_on")
    .order("sort_order")
    .overrideTypes<Row[], { merge: false }>();
  if (error) throw new Error(`명단을 읽지 못했습니다: ${error.message}`);
  return data.map((row) => ({ id: row.id, name: row.name, start: row.start_date, removedOn: row.removed_on }));
}

/** 팀원을 추가한다. 조는 미배정이고 표시 순서는 맨 끝이다. */
export async function addMember(rawName: unknown, start: unknown): Promise<WriteResult> {
  if (!isDate(start)) return { ok: false, error: "시작일을 올바른 날짜로 골라 주세요." };
  try {
    const members = await getMembers();
    const checked = checkName(rawName, members.map((member) => member.name));
    if (!checked.ok) return checked;
    const { data, error: orderError } = await supabaseAdmin()
      .from("members")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .overrideTypes<{ sort_order: number }[], { merge: false }>();
    if (orderError) return { ok: false, error: `팀원을 추가하지 못했습니다: ${orderError.message}` };
    const { error } = await supabaseAdmin()
      .from("members")
      .insert({ name: checked.name, sort_order: (data[0]?.sort_order ?? 0) + 1, start_date: start });
    if (error) return { ok: false, error: `팀원을 추가하지 못했습니다: ${error.message}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "팀원을 추가하지 못했습니다." };
  }
}

/** 이름을 고친다. 팀원 번호는 그대로라 과거 기록이 이어진다. */
export async function renameMember(id: unknown, rawName: unknown): Promise<WriteResult> {
  if (!Number.isInteger(id)) return { ok: false, error: "팀원을 찾지 못했습니다." };
  try {
    const members = await getMembers();
    if (!members.some((member) => member.id === id)) return { ok: false, error: "팀원을 찾지 못했습니다." };
    const checked = checkName(rawName, members.filter((member) => member.id !== id).map((member) => member.name));
    if (!checked.ok) return checked;
    const { error } = await supabaseAdmin().from("members").update({ name: checked.name }).eq("id", id as number);
    if (error) return { ok: false, error: `이름을 고치지 못했습니다: ${error.message}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "이름을 고치지 못했습니다." };
  }
}

/** 제거일을 정한다(removedOn이 null이면 제거 취소). 기록과 조 배정은 지우지 않는다. */
export async function setRemovedOn(id: unknown, removedOn: unknown): Promise<WriteResult> {
  if (!Number.isInteger(id)) return { ok: false, error: "팀원을 찾지 못했습니다." };
  try {
    const member = (await getMembers()).find((candidate) => candidate.id === id);
    if (!member) return { ok: false, error: "팀원을 찾지 못했습니다." };
    let value: string | null = null;
    if (removedOn !== null) {
      const checked = checkRemoval(member, removedOn);
      if (!checked.ok) return checked;
      value = checked.removedOn;
    }
    const { error } = await supabaseAdmin().from("members").update({ removed_on: value }).eq("id", id as number);
    if (error) return { ok: false, error: `제거 상태를 바꾸지 못했습니다: ${error.message}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "제거 상태를 바꾸지 못했습니다." };
  }
}
