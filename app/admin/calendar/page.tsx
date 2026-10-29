import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { CalendarEditor, type CalendarRow } from "@/components/calendar-editor";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { todayInSeoul } from "@/lib/attendance";
import { ruleHolidays } from "@/lib/calendar";
import { getCalendarEntries } from "@/lib/calendar/store";

import { addEntry, removeEntry, updateEntry } from "./actions";

export const metadata = { title: "휴일·행사 · 근태 현황판" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  await requireAdmin("/admin/calendar");
  const requested = (await searchParams).year;
  const currentYear = Number(todayInSeoul().slice(0, 4));
  const parsed = typeof requested === "string" && /^\d{4}$/.test(requested) ? Number(requested) : currentYear;
  const year = parsed >= 2000 && parsed <= 2100 ? parsed : currentYear;

  const nav = (
    <div className="flex flex-col items-end gap-2">
      <AdminNav />
      <nav aria-label="연도 이동" className="flex items-center gap-2">
        <Link href={`/admin/calendar?year=${year - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {year - 1}년
        </Link>
        <span className="text-sm font-medium">{year}년</span>
        <Link href={`/admin/calendar?year=${year + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {year + 1}년
        </Link>
      </nav>
    </div>
  );

  let rows: CalendarRow[] | null = null;
  let failure: string | null = null;
  try {
    const entries = await getCalendarEntries({ from: `${year}-01-01`, to: `${year}-12-31` });
    rows = [
      ...ruleHolidays(year).map((rule): CalendarRow => ({ id: null, date: rule.date, kind: "holiday", name: rule.name, rule: true })),
      ...entries.map((entry): CalendarRow => ({ id: entry.id, date: entry.date, kind: entry.kind, name: entry.name, rule: false })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
  } catch (error) {
    failure = error instanceof Error ? error.message : "잠시 뒤 다시 시도해 주세요.";
  }

  return (
    <PageShell
      title={`${year}년 휴일·행사`}
      description="휴일은 쉬는 날로 현황표에서 근태가 가려지고, 행사는 근무일에 날짜 위로 이름만 붙습니다. 하루에 하나씩 등록합니다."
      actions={nav}
    >
      {rows === null ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>달력 항목을 불러오지 못했습니다</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : (
        <CalendarEditor year={year} rows={rows} actions={{ add: addEntry, update: updateEntry, remove: removeEntry }} />
      )}
    </PageShell>
  );
}
