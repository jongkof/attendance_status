"use client";

import { useOptimistic, useState, useTransition } from "react";

import { CELL_BOX, TYPE_COLOR, UNCONFIRMED_BOX } from "@/components/attendance-style";
import { cn } from "@/lib/utils";

type ToggleResult = { ok: true; marked: boolean } | { ok: false; error: string };

/** 관리자가 누르면 일정 없는 칸이 출근(녹색)과 미확인(?) 사이를 오간다. */
export function UnconfirmedToggleCell({
  name,
  date,
  marked,
  toggle,
}: {
  name: string;
  date: string;
  marked: boolean;
  toggle: (name: string, date: string) => Promise<ToggleResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // 서버 응답을 기다리지 않고 바로 바뀌어 보이게 한다. 실패하면 원래 값으로 돌아간다.
  const [shown, setShown] = useOptimistic(marked);

  function run() {
    setError(null);
    startTransition(async () => {
      setShown(!marked);
      const result = await toggle(name, date);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      aria-pressed={shown}
      data-invalid={error ? "" : undefined}
      aria-label={`${name} ${date} ${shown ? "미확인, 눌러서 출근으로 되돌리기" : "출근, 눌러서 미확인으로 표시"}`}
      title={error ?? (shown ? "미확인 (누르면 출근으로 되돌립니다)" : "출근 (누르면 미확인으로 표시합니다)")}
      className={cn(
        CELL_BOX,
        shown ? UNCONFIRMED_BOX : TYPE_COLOR.출근,
        "cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-invalid:ring-3 data-invalid:ring-destructive/40",
      )}
    >
      {shown ? "?" : null}
    </button>
  );
}
