import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

import type { RemoteEdit, RemoteGroup, RemoteRule, RemoteSetup } from "./types";

type GroupRow = { id: number; name: string };
type MemberRow = { id: number; name: string; remote_group_id: number | null };
type EditRow = { member_id: number; work_date: string; kind: "add" | "remove" };
type WeekRow = { week: string; skip: boolean };
type RuleRow = { from_week: string; order_steps: string[]; starts: Record<string, number> };

export type WriteResult = { ok: true } | { ok: false; error: string };

/** 조 편성과 적용된 규칙. 조는 sort_order, 조 안 명단은 팀원 표시 순서다. */
export async function getRemoteSetup(): Promise<RemoteSetup> {
  const client = supabaseAdmin();
  const [groups, members, rules, edits, weeks] = await Promise.all([
    client.from("remote_groups").select("id, name").order("sort_order").overrideTypes<GroupRow[]>(),
    client.from("members").select("id, name, remote_group_id").order("sort_order").overrideTypes<MemberRow[]>(),
    client.from("remote_rules").select("from_week, order_steps, starts").order("from_week").overrideTypes<RuleRow[], { merge: false }>(),
    client.from("remote_cell_edits").select("member_id, work_date, kind").overrideTypes<EditRow[], { merge: false }>(),
    client.from("remote_week_overrides").select("week, skip").overrideTypes<WeekRow[], { merge: false }>(),
  ]);
  if (groups.error) throw new Error(`리모트 조를 읽지 못했습니다: ${groups.error.message}`);
  if (members.error) throw new Error(`명단을 읽지 못했습니다: ${members.error.message}`);
  if (rules.error) throw new Error(`리모트 규칙을 읽지 못했습니다: ${rules.error.message}`);
  if (edits.error) throw new Error(`리모트 직접 수정을 읽지 못했습니다: ${edits.error.message}`);
  if (weeks.error) throw new Error(`리모트 없는 주를 읽지 못했습니다: ${weeks.error.message}`);

  const built: RemoteGroup[] = groups.data.map((group) => ({
    id: group.id,
    name: group.name,
    members: members.data.filter((member) => member.remote_group_id === group.id).map((member) => member.name),
  }));
  const known = new Set(groups.data.map((group) => group.id));
  return {
    groups: built,
    unassigned: members.data
      .filter((member) => member.remote_group_id === null || !known.has(member.remote_group_id))
      .map((member) => member.name),
    rules: rules.data.map((rule): RemoteRule => ({ from: rule.from_week, order: rule.order_steps, starts: rule.starts })),
    edits: edits.data.flatMap((edit): RemoteEdit[] => {
      const member = members.data.find((row) => row.id === edit.member_id);
      return member ? [{ name: member.name, date: edit.work_date, kind: edit.kind }] : [];
    }),
    skipWeeks: Object.fromEntries(weeks.data.map((week) => [week.week, week.skip])),
  };
}

/** 조를 맨 끝에 추가한다. 이름 기본값은 "1조", "2조"처럼 순번이다. */
export async function addGroup(): Promise<WriteResult> {
  const client = supabaseAdmin();
  const { data, error } = await client
    .from("remote_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .overrideTypes<{ sort_order: number }[]>();
  if (error) return { ok: false, error: `조를 추가하지 못했습니다: ${error.message}` };
  const insert = await client
    .from("remote_groups")
    .insert({ name: `${data.length + 1}조`, sort_order: (data[0]?.sort_order ?? 0) + 1 });
  if (insert.error) return { ok: false, error: `조를 추가하지 못했습니다: ${insert.error.message}` };
  return { ok: true };
}

export async function renameGroup(id: number, name: string): Promise<WriteResult> {
  const { data, error } = await supabaseAdmin().from("remote_groups").update({ name }).eq("id", id).select("id");
  if (error) return { ok: false, error: `조 이름을 바꾸지 못했습니다: ${error.message}` };
  if (data.length === 0) return { ok: false, error: "조를 찾지 못했습니다. 이미 지워졌을 수 있습니다." };
  return { ok: true };
}

/** 조를 지운다. 그 조의 팀원은 미배정이 된다. */
export async function deleteGroup(id: number): Promise<WriteResult> {
  const { data, error } = await supabaseAdmin().from("remote_groups").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: `조를 지우지 못했습니다: ${error.message}` };
  if (data.length === 0) return { ok: false, error: "조를 찾지 못했습니다. 이미 지워졌을 수 있습니다." };
  return { ok: true };
}

/** 팀원을 조에 배정한다. groupId가 null이면 미배정이다. */
export async function assignMember(name: string, groupId: number | null): Promise<WriteResult> {
  const { data, error } = await supabaseAdmin()
    .from("members")
    .update({ remote_group_id: groupId })
    .eq("name", name)
    .select("id");
  if (error) return { ok: false, error: `조를 옮기지 못했습니다: ${error.message}` };
  if (data.length === 0) return { ok: false, error: "팀원 명단에 없는 이름입니다." };
  return { ok: true };
}

/** 규칙을 적용한다. 기준 주 이후에 있던 이전 규칙은 덮어쓴다. */
export async function applyRule(rule: RemoteRule): Promise<WriteResult> {
  const { error } = await supabaseAdmin().rpc("apply_remote_rule", {
    p_from_week: rule.from,
    p_order_steps: rule.order,
    p_starts: rule.starts,
  });
  if (error) return { ok: false, error: `규칙을 적용하지 못했습니다: ${error.message}` };
  return { ok: true };
}

/**
 * 칸의 직접 수정을 정한다. kind가 null이면 직접 수정을 지워 규칙대로 돌아간다.
 * 호출한 쪽이 팀원 번호를 이미 알면 넘겨서 조회 한 번을 줄인다.
 */
export async function setCellEdit(
  name: string,
  date: string,
  kind: "add" | "remove" | null,
  knownMemberId?: number,
): Promise<WriteResult> {
  const client = supabaseAdmin();
  let memberId = knownMemberId;
  if (memberId === undefined) {
    const member = await client.from("members").select("id").eq("name", name).overrideTypes<{ id: number }[]>();
    if (member.error) return { ok: false, error: `팀원을 찾지 못했습니다: ${member.error.message}` };
    if (member.data.length === 0) return { ok: false, error: "팀원 명단에 없는 이름입니다." };
    memberId = member.data[0].id;
  }
  const result =
    kind === null
      ? await client.from("remote_cell_edits").delete().eq("member_id", memberId).eq("work_date", date)
      : await client.from("remote_cell_edits").upsert({ member_id: memberId, work_date: date, kind });
  if (result.error) return { ok: false, error: `리모트를 바꾸지 못했습니다: ${result.error.message}` };
  return { ok: true };
}

/** 주의 리모트 없음 지정을 정한다. skip이 null이면 지정을 지워 휴일·행사 자동 판정으로 돌아간다. */
export async function setWeekOverride(week: string, skip: boolean | null): Promise<WriteResult> {
  const client = supabaseAdmin();
  const result =
    skip === null
      ? await client.from("remote_week_overrides").delete().eq("week", week)
      : await client.from("remote_week_overrides").upsert({ week, skip });
  if (result.error) return { ok: false, error: `주 설정을 바꾸지 못했습니다: ${result.error.message}` };
  return { ok: true };
}
