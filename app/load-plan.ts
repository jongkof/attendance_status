import "server-only";

import { calendarSets, type CalendarEntry } from "@/lib/calendar";
import { getCalendarEntries } from "@/lib/calendar/store";
import { orderedRoster, planRemoteCells, rosterBlocks, type RemoteSetup } from "@/lib/remote";
import { getRemoteSetup } from "@/lib/remote/store";

/**
 * 조 편성과 규칙을 읽어 날짜들의 계획된 리모트 칸("이름|날짜")과 표시 순서를 만든다.
 * 근태와 달력과 리모트 모듈은 서로 모르므로 여기서 합친다. 달력 항목은 기준 주부터 센 주마다 필요해서 전체를 읽는다.
 */
export async function loadPlan(days: readonly string[]): Promise<{
  setup: RemoteSetup;
  entries: CalendarEntry[];
  planned: string[];
  /** 직접 추가해서 현황표에 "리+"로 보일 칸 */
  added: string[];
  blocks: ReturnType<typeof rosterBlocks>;
  roster: string[];
}> {
  const [setup, entries] = await Promise.all([getRemoteSetup(), getCalendarEntries()]);
  const years = new Set([...days, ...setup.rules.map((rule) => rule.from)].map((date) => Number(date.slice(0, 4))));
  const { planned, added } = planRemoteCells(setup, days, calendarSets(entries, years));
  return { setup, entries, planned: [...planned], added: [...added], blocks: rosterBlocks(setup), roster: orderedRoster(setup) };
}
