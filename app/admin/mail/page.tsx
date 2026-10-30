import { CircleAlertIcon } from "lucide-react";
import { headers } from "next/headers";

import { AdminNav } from "@/components/admin-nav";
import { MailDatePicker } from "@/components/mail-date-picker";
import { MailPreview } from "@/components/mail-preview";
import { PageShell } from "@/components/page-shell";
import { YearNotice } from "@/components/year-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAdmin } from "@/lib/admin/auth";
import { isValidDate, todayInSeoul } from "@/lib/attendance";
import { buildMail } from "@/lib/mail";

import { loadMailInput } from "./load-mail-input";

export const metadata = { title: "오늘의 현황 메일 · 근태 현황판" };

/** 지금 요청이 들어온 주소(예: https://attendance-status.vercel.app). 따로 설정하지 않는다. */
async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const protocol = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export default async function MailPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  await requireAdmin("/admin/mail");
  const requested = (await searchParams).date;
  const today = todayInSeoul();
  const date = typeof requested === "string" && isValidDate(requested) ? requested : today;

  let content: ReturnType<typeof buildMail> | null = null;
  let failure: string | null = null;
  try {
    content = buildMail(await loadMailInput(date, await requestOrigin()));
  } catch (error) {
    failure = error instanceof Error ? error.message : "잠시 뒤 다시 시도해 주세요.";
  }

  return (
    <PageShell
      title="오늘의 현황 메일"
      description="그날의 현황을 메일 본문으로 만들어 미리 보고, 제목과 본문을 복사해 Outlook에 붙여 넣습니다. 고칠 내용은 근태 기록을 고쳐서 반영하세요."
      actions={<AdminNav />}
    >
      <YearNotice year={Number(date.slice(0, 4))} />
      <MailDatePicker date={date} today={today} />
      {content === null ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>본문을 만들지 못했습니다</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : content.kind === "weekend" ? (
        <Alert>
          <AlertTitle>근무일이 아닙니다</AlertTitle>
          <AlertDescription>{content.message}</AlertDescription>
        </Alert>
      ) : (
        <MailPreview subject={content.subject} html={content.html} text={content.text} />
      )}
    </PageShell>
  );
}
