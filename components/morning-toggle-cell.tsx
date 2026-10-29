"use client";

import { useOptimistic, useState, useTransition } from "react";

import { CELL_BOX, TOGGLE_HINT, TYPE_COLOR, TYPE_LETTER, UNCONFIRMED_BOX } from "@/components/attendance-style";
import { nextMorningState, type MorningState } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export type MorningToggleResult = { ok: true; state: MorningState } | { ok: false; error: string };

const LABEL: Record<MorningState, string> = { remote: "리모트", present: "출근", unconfirmed: "미확인" };
const NEXT_HINT: Record<MorningState, string> = {
  remote: "누르면 출근으로",
  present: "누르면 미확인(?)으로",
  unconfirmed: "누르면 리모트로",
};

/** 관리자가 누르면 리모트로 보이는 칸이 리모트 → 출근 → 미확인(?) → 리모트로 바뀐다. */
export function MorningToggleCell({
  name,
  date,
  state,
  toggle,
}: {
  name: string;
  date: string;
  state: MorningState;
  toggle: (name: string, date: string) => Promise<MorningToggleResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useOptimistic(state);

  function run() {
    setError(null);
    startTransition(async () => {
      setShown(nextMorningState(state));
      const result = await toggle(name, date);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      data-state={shown}
      data-invalid={error ? "" : undefined}
      aria-label={`${name} ${date} ${LABEL[shown]}, ${NEXT_HINT[shown].replace("누르면", "눌러서")}`}
      title={error ?? NEXT_HINT[shown]}
      className={cn(
        CELL_BOX,
        shown === "unconfirmed" ? UNCONFIRMED_BOX : shown === "present" ? TYPE_COLOR.출근 : TYPE_COLOR.리모트,
        TOGGLE_HINT,
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-invalid:ring-3 data-invalid:ring-destructive/40",
      )}
    >
      {shown === "unconfirmed" ? "?" : shown === "remote" ? TYPE_LETTER.리모트 : null}
    </button>
  );
}
