import { CircleAlertIcon } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { AttendanceLegend } from "@/components/attendance-legend";
import { AttendanceTable } from "@/components/attendance-table";
import { MonthNav } from "@/components/month-nav";
import { PageShell } from "@/components/page-shell";
import { YearNotice } from "@/components/year-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAdmin } from "@/lib/admin/auth";
import { parseMonth, todayInSeoul, weekdaysOfMonth } from "@/lib/attendance";

import { loadMonth } from "@/app/load-month";

import { toggleMorningConfirmation, toggleUnconfirmed } from "./actions";

export const metadata = { title: "관리자 현황표 · 근태 현황판" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  await requireAdmin("/admin");
  const today = todayInSeoul();
  const requested = (await searchParams).month;
  const { year, month } =
    (typeof requested === "string" ? parseMonth(requested) : null) ?? parseMonth(today.slice(0, 7))!;
  const days = weekdaysOfMonth(year, month);

  const actions = (
    <div className="flex flex-col items-end gap-2">
      <AdminNav />
      <MonthNav basePath="/admin" year={year} month={month} />
    </div>
  );
  const title = `${year}년 ${month}월 관리자 현황표`;

  let view: Awaited<ReturnType<typeof loadMonth>> | null = null;
  let failure: string | null = null;
  try {
    view = await loadMonth(days);
  } catch (error) {
    failure = error instanceof Error ? error.message : "잠시 뒤 다시 시도해 주세요.";
  }

  if (view === null) {
    return (
      <PageShell title={title} actions={actions}>
        <YearNotice year={year} />
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>근태 현황을 불러오지 못했습니다</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={title}
      description="아침에 실제 출근을 확인하고, 공지도 연락도 없이 자리에 없는 사람의 칸(오늘·지난 날짜의 녹색 칸)을 누르면 미확인(?)이 됩니다. 다시 누르면 출근으로 돌아옵니다. 리모트로 보이는 칸(노란 칸)은 누를 때마다 리모트 → 출근 → 미확인(?) → 리모트로 바뀌며, 근태 기록은 그대로입니다."
      actions={actions}
    >
      <YearNotice year={year} />
      <AttendanceLegend />
      <AttendanceTable
        roster={view.roster}
        days={days}
        records={view.records}
        unconfirmed={view.unconfirmed}
        confirmations={view.confirmations}
        dayMarks={view.dayMarks}
        blocks={view.blocks}
        planned={view.planned}
        added={view.added}
        today={today}
        showSummary
        toggle={toggleUnconfirmed}
        toggleMorning={toggleMorningConfirmation}
      />
    </PageShell>
  );
}
