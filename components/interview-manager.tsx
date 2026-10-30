"use client";

import { CircleAlertIcon } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { InterviewTable } from "@/components/interview-table";
import { InterviewCaptureButtons } from "@/components/table-capture-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DayMark } from "@/lib/calendar";
import type { InterviewMark } from "@/lib/interview";
import type { RosterBlock } from "@/lib/remote";
import type { Tenure } from "@/lib/roster";

type Result = { ok: true } | { ok: false; error: string };

/** 관리자 면담 표. 누르면 바로 바뀐 것처럼 보이고, 저장에 실패하면 원래대로 돌아오며 이유가 나온다. */
export function InterviewManager({
  blocks,
  days,
  today,
  dayMarks,
  tenures,
  interviews,
  setCell,
}: {
  blocks: readonly RosterBlock[];
  days: readonly string[];
  today: string;
  dayMarks: Record<string, DayMark>;
  tenures: Readonly<Record<string, Tenure>>;
  interviews: readonly InterviewMark[];
  setCell: (name: string, date: string, on: boolean) => Promise<Result>;
}) {
  const [error, setError] = useState<string | null>(null);
  // 저장 중에도 다른 칸을 이어서 누를 수 있도록 칸을 잠그지 않는다.
  const [, startTransition] = useTransition();
  const [shown, applyChange] = useOptimistic(
    new Set(interviews.map((mark) => `${mark.name}|${mark.date}`)),
    (current, change: { key: string; on: boolean }) => {
      const next = new Set(current);
      if (change.on) next.add(change.key);
      else next.delete(change.key);
      return next;
    },
  );

  function toggle(name: string, date: string, on: boolean) {
    setError(null);
    startTransition(async () => {
      applyChange({ key: `${name}|${date}`, on });
      const result = await setCell(name, date, on);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <InterviewCaptureButtons
        blocks={blocks}
        days={days}
        dayMarks={dayMarks}
        tenures={tenures}
        isInterview={(name, date) => shown.has(`${name}|${date}`)}
      />
      <div className="overflow-x-auto">
        <InterviewTable
          blocks={blocks}
          days={days}
          today={today}
          dayMarks={dayMarks}
          tenures={tenures}
          isInterview={(name, date) => shown.has(`${name}|${date}`)}
          onToggle={toggle}
        />
      </div>
    </div>
  );
}
