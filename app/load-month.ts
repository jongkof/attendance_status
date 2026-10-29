import "server-only";

import { loadPlan } from "@/app/load-plan";
import { getMonthView } from "@/lib/attendance/store";
import { dayMarksFor } from "@/lib/calendar";

/** 현황표 한 달치를 그리는 데 필요한 값(조 편성 순서의 명단, 근태 기록, 미확인 표시, 계획된 리모트, 날짜별 휴일·행사 표시). */
export async function loadMonth(days: readonly string[]) {
  const range = { from: days[0], to: days[days.length - 1] };
  const [view, plan] = await Promise.all([getMonthView(range), loadPlan(days)]);
  // 편성에 없는 팀원이 있어도 빠지지 않게 명단 뒤에 붙인다.
  const roster = [...plan.roster, ...view.roster.filter((name) => !plan.roster.includes(name))];
  return {
    ...view,
    roster,
    blocks: plan.blocks,
    planned: plan.planned,
    added: plan.added,
    dayMarks: dayMarksFor(days, plan.entries),
  };
}
