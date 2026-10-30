"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { YearNoticeKind } from "@/lib/calendar";

/** 개발 담당자에게 받는 연도별 공휴일 SQL 파일 이름 형식과 위치. */
const SQL_FILE_HINT = "저장소의 supabase/migrations 폴더에 있는 `<날짜>_holidays_<연도>.sql` 형식의 파일";

function noticeTitle({ kind, year }: YearNoticeKind): string {
  return kind === "viewed"
    ? `${year}년 공휴일이 아직 등록되지 않아 공휴일이 출근으로 보일 수 있습니다.`
    : "내년 공휴일이 아직 등록되지 않았습니다.";
}

function RegistrationSteps({ year }: { year: number }) {
  return (
    <div className="mt-3 flex flex-col gap-4 text-foreground">
      <section>
        <h3 className="font-medium">방법 1. 달력 편집 화면에서 하나씩 등록</h3>
        <p className="text-muted-foreground">연도 하나에 20건 안팎입니다.</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>관리자 화면 머리글에서 &lsquo;달력 편집&rsquo;으로 이동합니다.</li>
          <li>{year}년을 선택합니다.</li>
          <li>날짜와 이름을 입력하고 종류를 &lsquo;휴일&rsquo;로 골라 추가합니다.</li>
          <li>모든 공휴일을 넣을 때까지 반복합니다. 설날·추석은 앞뒤 날까지 4일을 넣습니다.</li>
          <li>마지막으로 관리자 현황표에서 휴일 칸이 회색으로 보이는지 확인합니다.</li>
        </ol>
      </section>
      <section>
        <h3 className="font-medium">방법 2. 준비된 SQL 파일을 한 번에 실행</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>
            개발 담당자에게 {year}년 공휴일 SQL 파일을 받습니다. 파일은 {SQL_FILE_HINT}입니다. 개발 담당자에게 받은 파일만 사용하세요.
          </li>
          <li>Supabase 대시보드에 로그인해 이 서비스의 프로젝트를 엽니다.</li>
          <li>왼쪽 메뉴에서 SQL Editor를 엽니다.</li>
          <li>새 쿼리(New query)를 만들어 파일 내용을 모두 붙여 넣습니다.</li>
          <li>Run을 누릅니다.</li>
          <li>성공 메시지(&ldquo;Success&rdquo;)가 나오는지 확인합니다.</li>
          <li>이 서비스의 달력 편집 화면을 새로 고쳐 {year}년 휴일이 보이는지 확인합니다.</li>
        </ol>
        <p className="mt-1 text-muted-foreground">
          같은 SQL을 두 번 실행해도 같은 날짜가 중복되지 않습니다. 오류가 나면 아무것도 들어가지 않으니, 오류 문구를 그대로 개발 담당자에게 전달하세요.
        </p>
      </section>
      <p className="text-muted-foreground">어느 방법이든 끝나면 이 화면을 새로 고쳐 안내가 사라졌는지 확인하세요.</p>
    </div>
  );
}

function YearNoticeItem({ notice }: { notice: YearNoticeKind }) {
  const [open, setOpen] = useState(false);
  const panelId = `year-notice-${notice.kind}-${notice.year}`;
  return (
    <Alert>
      <TriangleAlertIcon />
      <AlertTitle>{noticeTitle(notice)}</AlertTitle>
      <AlertDescription>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "등록 방법 접기" : "등록 방법 보기"}
        </Button>
        <div id={panelId} hidden={!open}>
          {open ? <RegistrationSteps year={notice.year} /> : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/** 공휴일이 등록되지 않은 연도를 알리는 관리자 화면 안내. 알릴 것이 없으면 아무것도 그리지 않는다. */
export function YearNoticeAlert({ notices }: { notices: YearNoticeKind[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {notices.map((notice) => (
        <YearNoticeItem key={`${notice.kind}-${notice.year}`} notice={notice} />
      ))}
    </div>
  );
}
