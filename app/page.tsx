import { CircleAlertIcon } from "lucide-react";

import { AttendanceLegend } from "@/components/attendance-legend";
import { AttendanceTable } from "@/components/attendance-table";
import { MonthNav } from "@/components/month-nav";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseMonth, todayInSeoul, weekdaysOfMonth } from "@/lib/attendance";

import { loadMonth } from "@/app/load-month";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const today = todayInSeoul();
  const requested = (await searchParams).month;
  const { year, month } =
    (typeof requested === "string" ? parseMonth(requested) : null) ?? parseMonth(today.slice(0, 7))!;
  const days = weekdaysOfMonth(year, month);

  const monthNav = <MonthNav basePath="/" year={year} month={month} />;
  const title = `${year}년 ${month}월 근태 현황`;

  let view: Awaited<ReturnType<typeof loadMonth>> | null = null;
  let failure: string | null = null;
  try {
    view = await loadMonth(days);
  } catch (error) {
    failure = error instanceof Error ? error.message : "잠시 뒤 다시 시도해 주세요.";
  }

  if (view === null) {
    return (
      <PageShell title={title} actions={monthNav}>
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>근태 현황을 불러오지 못했습니다</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell title={title} description="월–금 근무일만 보여 줍니다. 칸을 누르면 비고를 볼 수 있습니다." actions={monthNav}>
      {view.records.length === 0 ? (
        <p className="text-sm text-muted-foreground">이 달에 반영된 근태가 아직 없습니다.</p>
      ) : null}
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
        tenures={view.tenures}
        today={today}
      />
    </PageShell>
  );
}
