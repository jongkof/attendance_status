import { createRemotePlanner, createSkipWeekCheck } from "./rotation";
import type { RemoteSetup } from "./types";

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

/**
 * 날짜들 사이에서 계획된 리모트인 칸을 "이름|날짜" 집합으로 구한다.
 * marked는 휴일·행사가 있는 날짜, holidays는 휴일인 날짜다. 규칙이 없으면 비어 있다.
 */
export function plannedRemoteCells(
  setup: RemoteSetup,
  days: readonly string[],
  calendar: { marked: ReadonlySet<string>; holidays: ReadonlySet<string> },
): Set<string> {
  const cells = new Set<string>();
  if (setup.rules.length === 0) return cells;
  const planner = createRemotePlanner(setup.rules, createSkipWeekCheck(calendar.marked), calendar.holidays);
  for (const group of setup.groups) {
    for (const day of days) {
      if (!planner.isPlanned(group.id, day)) continue;
      for (const name of group.members) cells.add(`${name}|${day}`);
    }
  }
  return cells;
}
