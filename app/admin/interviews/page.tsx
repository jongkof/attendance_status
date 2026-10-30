import { CircleAlertIcon } from "lucide-react";

import { AdminNav } from "@/components/admin-nav";
import { InterviewManager } from "@/components/interview-manager";
import { MonthNav } from "@/components/month-nav";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAdmin } from "@/lib/admin/auth";
import { parseMonth, todayInSeoul, weekdaysOfMonth } from "@/lib/attendance";
import { dayMarksFor } from "@/lib/calendar";
import { getInterviews } from "@/lib/interview/store";

import { loadPlan } from "@/app/load-plan";

import { setInterviewCell } from "./actions";

export const metadata = { title: "면담 관리 · 근태 현황판" };

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  await requireAdmin("/admin/interviews");
  const today = todayInSeoul();
  const requested = (await searchParams).month;
  const { year, month } =
    (typeof requested === "string" ? parseMonth(requested) : null) ?? parseMonth(today.slice(0, 7))!;
  const days = weekdaysOfMonth(year, month);

  const actions = (
    <div className="flex flex-col items-end gap-2">
      <AdminNav />
      <MonthNav basePath="/admin/interviews" year={year} month={month} />
    </div>
  );

  let data: {
    plan: Awaited<ReturnType<typeof loadPlan>>;
    interviews: Awaited<ReturnType<typeof getInterviews>>;
  } | null = null;
  let failure: string | null = null;
  try {
    const [plan, interviews] = await Promise.all([
      loadPlan(days),
      getInterviews({ from: days[0], to: days[days.length - 1] }),
    ]);
    data = { plan, interviews };
  } catch (error) {
    failure = error instanceof Error ? error.message : "잠시 뒤 다시 시도해 주세요.";
  }

  return (
    <PageShell
      title={`${year}년 ${month}월 면담 관리`}
      description="팀장 1on1 면담이 있는 사람과 날짜의 칸을 누르면 면담이 켜지고, 다시 누르면 꺼집니다. 켜진 칸은 현황표에 플래그로 보이고 그날 현황 메일의 “오늘 면담”에 나갑니다. 휴일과 재직 기간이 아닌 칸은 누를 수 없습니다."
      actions={actions}
    >
      {data === null ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>면담 표시를 불러오지 못했습니다</AlertTitle>
          <AlertDescription>
            {failure} 처음 쓰는 경우 Supabase SQL Editor에서 supabase/migrations/20261031030000_interview_marks.sql을 실행했는지 확인해 주세요.
          </AlertDescription>
        </Alert>
      ) : (
        <InterviewManager
          blocks={data.plan.blocks}
          days={days}
          today={today}
          dayMarks={dayMarksFor(days, data.plan.entries)}
          tenures={data.plan.tenures}
          interviews={data.interviews}
          setCell={setInterviewCell}
        />
      )}
    </PageShell>
  );
}
