import { CircleAlertIcon } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { AttendanceLegend } from "@/components/attendance-legend";
import { AttendanceTable } from "@/components/attendance-table";
import { MonthNav } from "@/components/month-nav";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAdmin } from "@/lib/admin/auth";
import { parseMonth, todayInSeoul, weekdaysOfMonth } from "@/lib/attendance";
import { getMonthView } from "@/lib/attendance/store";

import { toggleUnconfirmed } from "./actions";

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

  let view: Awaited<ReturnType<typeof getMonthView>> | null = null;
  let failure: string | null = null;
  try {
    view = await getMonthView({ from: days[0], to: days[days.length - 1] });
  } catch (error) {
    failure = error instanceof Error ? error.message : "잠시 뒤 다시 시도해 주세요.";
  }

  if (view === null) {
    return (
      <PageShell title={title} actions={actions}>
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
      description="아침에 실제 출근을 확인하고, 공지도 연락도 없이 자리에 없는 사람의 칸(오늘·지난 날짜의 녹색 칸)을 누르면 미확인(?)이 됩니다. 다시 누르면 출근으로 돌아옵니다."
      actions={actions}
    >
      <AttendanceLegend />
      <AttendanceTable
        roster={view.roster}
        days={days}
        records={view.records}
        unconfirmed={view.unconfirmed}
        today={today}
        toggle={toggleUnconfirmed}
      />
    </PageShell>
  );
}
