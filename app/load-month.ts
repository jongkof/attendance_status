import "server-only";

import { loadPlan } from "@/app/load-plan";
import { getMonthView } from "@/lib/attendance/store";
import { dayMarksFor } from "@/lib/calendar";
import { getInterviews } from "@/lib/interview/store";

/** 현황표 한 달치를 그리는 데 필요한 값(그 달에 재직한 팀원의 조 편성 순서 명단, 근태 기록, 미확인 표시, 계획된 리모트, 날짜별 휴일·행사 표시, 팀원별 재직 기간, 면담이 켜진 칸). */
export async function loadMonth(days: readonly string[]) {
  const range = { from: days[0], to: days[days.length - 1] };
  const [view, plan, interviews] = await Promise.all([getMonthView(range), loadPlan(days), getInterviews(range)]);
  return {
    ...view,
    interviews,
    roster: plan.roster,
    blocks: plan.blocks,
    planned: plan.planned,
    added: plan.added,
    tenures: plan.tenures,
    dayMarks: dayMarksFor(days, plan.entries),
  };
}
