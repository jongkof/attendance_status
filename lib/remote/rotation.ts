import { WEEKDAY_STEPS,type RemoteRule } from "./types";
import { addDays, mondayOf, weekdayIndex, weeksBetween } from "./week";

const mod = (value: number, size: number) => ((value % size) + size) % size;

/** 규칙은 from 오름차순이어야 한다. 그 주에 적용되는 규칙(첫 규칙보다 앞선 주는 첫 규칙)을 돌려준다. */
export function ruleForWeek(rules: readonly RemoteRule[], week: string): RemoteRule | null {
  let found: RemoteRule | null = rules[0] ?? null;
  for (const rule of rules) if (rule.from <= week) found = rule;
  return found;
}

/**
 * 근무일(월–금)에 휴일이나 행사가 하나라도 있는 주인지. markedDays는 휴일·행사가 있는 날짜 집합이다.
 * overrides는 관리자가 직접 정한 주(월요일 → 리모트 없음 여부)로, 있으면 자동 판정보다 우선한다.
 */
export function createSkipWeekCheck(
  markedDays: ReadonlySet<string>,
  overrides: Readonly<Record<string, boolean>> = {},
): (week: string) => boolean {
  return (week) => {
    if (week in overrides) return overrides[week];
    return WEEKDAY_STEPS.some((_, index) => markedDays.has(addDays(week, index)));
  };
}

/**
 * 조 하나의 리모트 요일(0=월)을 주마다 구하는 계산기를 만든다. 리모트 없는 주는 순환을 소모하지 않으므로
 * 기준 주와의 사이에서 그런 주를 빼고 센다. 리모트가 없으면 null.
 */
export function createRemotePlanner(
  rules: readonly RemoteRule[],
  isSkipWeek: (week: string) => boolean,
  holidays: ReadonlySet<string>,
) {
  const cache = new Map<string, number | null>();

  function dayOfWeek(groupId: number, week: string): number | null {
    const cacheKey = `${groupId}|${week}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

    let day: number | null = null;
    const rule = ruleForWeek(rules, week);
    if (rule && rule.order.length > 0 && !isSkipWeek(week)) {
      const diff = weeksBetween(rule.from, week);
      let moved = 0;
      if (diff > 0) {
        for (let step = 1; step <= diff; step++) if (!isSkipWeek(addDays(rule.from, step * 7))) moved++;
      } else {
        for (let step = diff; step < 0; step++) if (!isSkipWeek(addDays(rule.from, step * 7))) moved--;
      }
      const start = rule.starts[String(groupId)] ?? 0;
      const index = (WEEKDAY_STEPS as readonly string[]).indexOf(rule.order[mod(start + moved, rule.order.length)]);
      day = index < 0 ? null : index;
    }
    cache.set(cacheKey, day);
    return day;
  }

  /** 그 날 그 조가 리모트로 계획되어 있는지. 휴일인 날은 리모트가 아니다. */
  function isPlanned(groupId: number, date: string): boolean {
    if (holidays.has(date)) return false;
    return dayOfWeek(groupId, mondayOf(date)) === weekdayIndex(date);
  }

  return { dayOfWeek, isPlanned };
}
