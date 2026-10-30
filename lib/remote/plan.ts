import { createRemotePlanner, createSkipWeekCheck } from "./rotation";
import type { RemoteSetup } from "./types";
import { mondayOf, weekdayIndex } from "./week";

/** 현황표가 보여 줄 팀원 묶음. group이 null이면 어느 조에도 속하지 않은 팀원이다(맨 위, 라벨 없음). */
export type RosterBlock = { name: string | null; members: string[] };

/** 조 편성이 정한 표시 순서: 미배정, 그다음 조 순서대로. 팀원이 없는 조는 건너뛴다. */
export function rosterBlocks(setup: RemoteSetup): RosterBlock[] {
  const blocks: RosterBlock[] = [];
  if (setup.unassigned.length > 0) blocks.push({ name: null, members: [...setup.unassigned] });
  for (const group of setup.groups) if (group.members.length > 0) blocks.push({ name: group.name, members: [...group.members] });
  return blocks;
}

/** 조 편성 순서대로 늘어놓은 팀원 이름. 조가 없으면 미배정(명단 순서)뿐이라 이전과 같다. */
export function orderedRoster(setup: RemoteSetup): string[] {
  return rosterBlocks(setup).flatMap((block) => block.members);
}

/** 팀원 이름 목록에서 keep이 거짓인 이름을 뺀 조 편성. 조 배정과 규칙은 그대로다. */
export function withoutMembers(setup: RemoteSetup, keep: (name: string) => boolean): RemoteSetup {
  return {
    ...setup,
    groups: setup.groups.map((group) => ({ ...group, members: group.members.filter(keep) })),
    unassigned: setup.unassigned.filter(keep),
  };
}

/** marked는 휴일·행사가 있는 날짜, holidays는 휴일인 날짜다. */
type CalendarSets = { marked: ReadonlySet<string>; holidays: ReadonlySet<string> };

/**
 * 규칙, 직접 수정, 주 지정을 합친 리모트 계획.
 * groupId가 null이면 어느 조에도 속하지 않은 팀원이라 직접 지정한 칸만 리모트가 된다.
 */
export function createRemotePlan(setup: RemoteSetup, calendar: CalendarSets) {
  const isSkipWeek = createSkipWeekCheck(calendar.marked, setup.skipWeeks ?? {});
  const planner = createRemotePlanner(setup.rules, isSkipWeek, calendar.holidays);
  const edits = new Map((setup.edits ?? []).map((edit) => [`${edit.name}|${edit.date}`, edit.kind]));

  /** 직접 수정을 빼고 규칙만으로 본 계획. */
  const byRule = (groupId: number | null, date: string) => groupId !== null && planner.isPlanned(groupId, date);

  function isPlanned(groupId: number | null, name: string, date: string): boolean {
    if (calendar.holidays.has(date)) return false;
    const edit = edits.get(`${name}|${date}`);
    if (edit === "remove") return false;
    if (byRule(groupId, date)) return true;
    return edit === "add" && !isSkipWeek(mondayOf(date));
  }

  const isEdited = (name: string, date: string) => edits.has(`${name}|${date}`);
  const isAdded = (groupId: number | null, name: string, date: string) =>
    edits.get(`${name}|${date}`) === "add" && isPlanned(groupId, name, date);

  return { isSkipWeek, byRule, isPlanned, isEdited, isAdded };
}

/**
 * 날짜들 사이의 리모트 계획. planned는 계획된 리모트인 칸("이름|날짜", 직접 수정 포함),
 * 재직 중이 아닌 날(isMemberOn이 거짓)에는 계획하지 않는다. added는 그중 직접 추가해서 현황표에 "리+"로 보일 칸이다. 규칙도 직접 수정도 없으면 둘 다 비어 있다.
 */
export function planRemoteCells(
  setup: RemoteSetup,
  days: readonly string[],
  calendar: CalendarSets,
  /** 그 날 그 팀원이 재직 중인지. 주면 재직 중인 날에만 계획한다. */
  isMemberOn: (name: string, date: string) => boolean = () => true,
) {
  const plan = createRemotePlan(setup, calendar);
  const planned = new Set<string>();
  const added = new Set<string>();
  const people: { groupId: number | null; name: string }[] = [
    ...setup.groups.flatMap((group) => group.members.map((name) => ({ groupId: group.id, name }))),
    ...setup.unassigned.map((name) => ({ groupId: null, name })),
  ];
  for (const { groupId, name } of people) {
    for (const day of days) {
      if (!isMemberOn(name, day) || !plan.isPlanned(groupId, name, day)) continue;
      planned.add(`${name}|${day}`);
      if (plan.isAdded(groupId, name, day)) added.add(`${name}|${day}`);
    }
  }
  return { planned, added };
}

/** 계획된 리모트인 칸만("이름|날짜"). */
export function plannedRemoteCells(
  setup: RemoteSetup,
  days: readonly string[],
  calendar: CalendarSets,
  isMemberOn?: (name: string, date: string) => boolean,
): Set<string> {
  return planRemoteCells(setup, days, calendar, isMemberOn).planned;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 칸을 원하는 상태(리모트 여부)로 만들 때 저장할 직접 수정. null이면 규칙대로라서 직접 수정을 지운다.
 * 주말, 휴일, 리모트 없는 주의 칸은 바꿀 수 없다. 직접 수정은 뺀 계획과 비교하므로 규칙이 바뀌어도 남는다.
 */
export function decideCellEdit(
  setup: RemoteSetup,
  calendar: CalendarSets,
  name: string,
  date: string,
  wantRemote: boolean,
): { ok: true; kind: "add" | "remove" | null } | { ok: false; error: string } {
  if (!DATE.test(date) || Number.isNaN(Date.parse(date))) return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  if (weekdayIndex(date) > 4) return { ok: false, error: "근무일(월–금)만 바꿀 수 있습니다." };
  if (calendar.holidays.has(date)) return { ok: false, error: "휴일에는 리모트를 지정할 수 없습니다." };
  const plan = createRemotePlan({ ...setup, edits: [] }, calendar);
  if (plan.isSkipWeek(mondayOf(date))) return { ok: false, error: "리모트 없는 주에는 리모트를 지정할 수 없습니다. 주 체크를 먼저 풀어 주세요." };
  const group = setup.groups.find((candidate) => candidate.members.includes(name));
  const byRule = plan.byRule(group?.id ?? null, date);
  if (wantRemote === byRule) return { ok: true, kind: null };
  return { ok: true, kind: wantRemote ? "add" : "remove" };
}

/** 주 체크를 원하는 상태로 만들 때 저장할 값. null이면 휴일·행사 자동 판정과 같아서 지정을 지운다. */
export function decideWeekOverride(calendar: CalendarSets, week: string, skip: boolean): { ok: true; skip: boolean | null } | { ok: false; error: string } {
  if (!DATE.test(week) || Number.isNaN(Date.parse(week)) || weekdayIndex(week) !== 0) {
    return { ok: false, error: "주는 월요일 날짜로 지정해 주세요." };
  }
  const auto = createSkipWeekCheck(calendar.marked)(week);
  return { ok: true, skip: skip === auto ? null : skip };
}
