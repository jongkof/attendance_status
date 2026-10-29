import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

import type { RemoteGroup, RemoteRule, RemoteSetup } from "./types";

type GroupRow = { id: number; name: string };
type MemberRow = { name: string; remote_group_id: number | null };
type RuleRow = { from_week: string; order_steps: string[]; starts: Record<string, number> };

export type WriteResult = { ok: true } | { ok: false; error: string };

/** 조 편성과 적용된 규칙. 조는 sort_order, 조 안 명단은 팀원 표시 순서다. */
export async function getRemoteSetup(): Promise<RemoteSetup> {
  const client = supabaseAdmin();
  const [groups, members, rules] = await Promise.all([
    client.from("remote_groups").select("id, name").order("sort_order").overrideTypes<GroupRow[]>(),
    client.from("members").select("name, remote_group_id").order("sort_order").overrideTypes<MemberRow[]>(),
    client.from("remote_rules").select("from_week, order_steps, starts").order("from_week").overrideTypes<RuleRow[], { merge: false }>(),
  ]);
  if (groups.error) throw new Error(`리모트 조를 읽지 못했습니다: ${groups.error.message}`);
  if (members.error) throw new Error(`명단을 읽지 못했습니다: ${members.error.message}`);
  if (rules.error) throw new Error(`리모트 규칙을 읽지 못했습니다: ${rules.error.message}`);

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
