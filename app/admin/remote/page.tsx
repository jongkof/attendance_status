import { CircleAlertIcon } from "lucide-react";

import { AdminNav } from "@/components/admin-nav";
import { MonthNav } from "@/components/month-nav";
import { PageShell } from "@/components/page-shell";
import { RemoteManager } from "@/components/remote-manager";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAdmin } from "@/lib/admin/auth";
import { parseMonth, todayInSeoul, weekdaysOfMonth } from "@/lib/attendance";
import { getRecords } from "@/lib/attendance/store";
import { getCalendarEntries } from "@/lib/calendar/store";
import { getRemoteSetup } from "@/lib/remote/store";

import { addRemoteGroup, applyRemoteRule, assignRemoteMember, deleteRemoteGroup, renameRemoteGroup } from "./actions";

export const metadata = { title: "리모트 관리 · 근태 현황판" };

export default async function RemotePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  await requireAdmin("/admin/remote");
  const today = todayInSeoul();
  const requested = (await searchParams).month;
  const { year, month } =
    (typeof requested === "string" ? parseMonth(requested) : null) ?? parseMonth(today.slice(0, 7))!;
  const days = weekdaysOfMonth(year, month);

  const actions = (
    <div className="flex flex-col items-end gap-2">
      <AdminNav />
      <MonthNav basePath="/admin/remote" year={year} month={month} />
    </div>
  );
  const description =
    "조를 편성하고 순환 규칙을 정하면 아래 표에 리모트가 미리 채워집니다. 규칙은 “적용”을 눌러야 저장됩니다.";

  let data: {
    setup: Awaited<ReturnType<typeof getRemoteSetup>>;
    entries: Awaited<ReturnType<typeof getCalendarEntries>>;
    records: Awaited<ReturnType<typeof getRecords>>;
  } | null = null;
  let failure: string | null = null;
  try {
    const [setup, entries, records] = await Promise.all([
      getRemoteSetup(),
      getCalendarEntries(),
      getRecords({ from: days[0], to: days[days.length - 1] }),
    ]);
    data = { setup, entries, records };
  } catch (error) {
    failure = error instanceof Error ? error.message : "잠시 뒤 다시 시도해 주세요.";
  }

  return (
    <PageShell title={`${year}년 ${month}월 리모트 관리`} description={description} actions={actions}>
      {data === null ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>리모트 설정을 불러오지 못했습니다</AlertTitle>
          <AlertDescription>
            {failure} 처음 쓰는 경우 Supabase SQL Editor에서 supabase/migrations/20261030000000_remote_rotation.sql을
            실행했는지 확인해 주세요.
          </AlertDescription>
        </Alert>
      ) : (
        <RemoteManager
          setup={data.setup}
          entries={data.entries}
          records={data.records}
          days={days}
          today={today}
          actions={{
            addGroup: addRemoteGroup,
            renameGroup: renameRemoteGroup,
            deleteGroup: deleteRemoteGroup,
            assignMember: assignRemoteMember,
            applyRule: applyRemoteRule,
          }}
        />
      )}
    </PageShell>
  );
}
