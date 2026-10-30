"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin/auth";
import { calendarSets } from "@/lib/calendar";
import { getCalendarEntries } from "@/lib/calendar/store";
import { todayInSeoul } from "@/lib/attendance";
import { checkRuleInput, checkRuleShape, decideCellEdit, decideWeekOverride, mondayOf, withoutMembers, type RemoteRule } from "@/lib/remote";
import {
  addGroup,
  applyRule,
  assignMember,
  deleteGroup,
  getRemoteSetup,
  renameGroup,
  setCellEdit,
  setWeekOverride,
  type WriteResult,
} from "@/lib/remote/store";
import { ALWAYS, isActiveOn, isCurrent, tenureOf } from "@/lib/roster";
import { getMembers } from "@/lib/roster/store";

const LOGIN_REQUIRED = "로그인이 필요합니다. 관리자 로그인 후 다시 시도해 주세요.";

async function write(run: () => Promise<WriteResult>): Promise<WriteResult> {
  try {
    const result = await run();
    if (result.ok) {
      revalidatePath("/admin/remote");
      revalidatePath("/");
      revalidatePath("/admin");
    }
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "저장하지 못했습니다." };
  }
}

/** 조를 맨 끝에 추가한다. */
export async function addRemoteGroup(): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  return write(addGroup);
}

export async function renameRemoteGroup(id: number, name: string): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  const trimmed = String(name ?? "").trim();
  if (!Number.isInteger(id) || trimmed === "") return { ok: false, error: "조 이름을 입력해 주세요." };
  return write(() => renameGroup(id, trimmed));
}

/** 조를 지운다. 그 조의 팀원은 미배정이 된다. */
export async function deleteRemoteGroup(id: number): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  if (!Number.isInteger(id)) return { ok: false, error: "조를 찾지 못했습니다." };
  return write(() => deleteGroup(id));
}

/** 팀원을 조에 배정한다. groupId가 null이면 미배정으로 옮긴다. */
export async function assignRemoteMember(name: string, groupId: number | null): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  if (groupId !== null && !Number.isInteger(groupId)) return { ok: false, error: "조를 찾지 못했습니다." };
  return write(() => assignMember(String(name ?? ""), groupId));
}

/** 규칙을 적용한다. 기준 주(고른 날이 속한 주의 월요일) 이후에 있던 이전 규칙은 덮어쓴다. */
export async function applyRemoteRule(input: RemoteRule): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  const checkedInput = checkRuleInput(input);
  if (!checkedInput.ok) return checkedInput;
  return write(async () => {
    const [setup, members] = await Promise.all([getRemoteSetup(), getMembers()]);
    // 제거된 팀원만 남은 조는 세지 않는다.
    const tenures = tenureOf(members);
    const current = withoutMembers(setup, (name) => isCurrent(tenures[name] ?? ALWAYS, todayInSeoul()));
    const filled = current.groups.filter((group) => group.members.length > 0);
    const shape = checkRuleShape(input.order.length, filled.length);
    if (!shape.ok) return shape;
    // 팀원이 있는 조는 시작 위치가 반드시 있어야 하므로 빠진 조는 순서대로 채운다.
    const starts: Record<string, number> = {};
    filled.forEach((group, index) => {
      starts[String(group.id)] = input.starts[String(group.id)] ?? index % input.order.length;
    });
    return applyRule({ from: mondayOf(input.from), order: input.order, starts });
  });
}

/** 휴일·행사 계산에 쓰는 달력 집합. 규칙 휴일은 date가 속한 해 앞뒤로 넉넉히 센다. */
async function calendarAround(date: string) {
  const year = Number(date.slice(0, 4));
  return calendarSets(await getCalendarEntries(), [year - 1, year, year + 1]);
}

/** 그 사람·날짜의 리모트를 지정(remote=true)하거나 해제(false)한다. 규칙대로가 되면 직접 수정이 지워진다. */
export async function setRemoteCell(name: string, date: string, remote: boolean): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  if (typeof name !== "string" || typeof date !== "string" || typeof remote !== "boolean") {
    return { ok: false, error: "요청이 올바르지 않습니다." };
  }
  return write(async () => {
    const [setup, calendar, members] = await Promise.all([getRemoteSetup(), calendarAround(date), getMembers()]);
    const member = members.find((candidate) => candidate.name === name);
    if (member && !isActiveOn(member, date)) return { ok: false, error: "재직 기간이 아닌 날짜에는 리모트를 지정할 수 없습니다." };
    const decision = decideCellEdit(setup, calendar, name, date, remote);
    if (!decision.ok) return decision;
    return setCellEdit(name, date, decision.kind, member?.id);
  });
}

/** 주(월요일)의 "리모트 없음"을 켜거나 끈다. 적용 확인 없이 바로 저장된다. */
export async function setRemoteSkipWeek(week: string, skip: boolean): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  if (typeof week !== "string" || typeof skip !== "boolean") return { ok: false, error: "요청이 올바르지 않습니다." };
  return write(async () => {
    const decision = decideWeekOverride(await calendarAround(week), week, skip);
    if (!decision.ok) return decision;
    return setWeekOverride(week, decision.skip);
  });
}
