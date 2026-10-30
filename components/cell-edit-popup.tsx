"use client";

import { useState, useTransition } from "react";

import { TYPE_COLOR, TYPE_LETTER } from "@/components/attendance-style";
import { useCellEdit, type CellTarget } from "@/components/cell-edit";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import { ATTENDANCE_TYPES, CELL_EDIT_PERIODS, shortDate, type AttendanceType, type CellChoice } from "@/lib/attendance";
import { cn } from "@/lib/utils";

const ROW =
  "flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-[13px] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent";
const SWATCH = "flex size-5 shrink-0 items-center justify-center rounded-[3px] text-[11px] font-semibold";
const ACTION = "h-[1.875rem] w-full justify-start px-2.5 text-[13px]";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-1 border-t pt-2">
      <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground">{title}</h4>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </section>
  );
}

/** 칸을 눌렀을 때 그 칸 옆에 뜨는 수정 팝업(목록형). 항목을 고르면 바로 저장되고 닫힌다. */
export function CellEditPopup() {
  const { target, close } = useCellEdit();
  return (
    <Popover open={target !== null} onOpenChange={(open) => !open && close()}>
      {target ? (
        <PopoverContent
          anchor={target.anchor}
          side="bottom"
          align="center"
          sideOffset={6}
          collisionPadding={6}
          className="max-h-(--available-height) w-62 gap-2 overflow-y-auto p-2.5 text-[13px]"
        >
          <PopupBody key={`${target.name}|${target.date}`} target={target} />
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

function PopupBody({ target }: { target: CellTarget }) {
  const { actions, committed, close } = useCellEdit();
  const { name, date, status } = target;
  const [expanded, setExpanded] = useState<AttendanceType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(request: () => Promise<{ ok: true } | { ok: false; error: string }>, summary: string) {
    setError(null);
    startTransition(async () => {
      const result = await request();
      if (result.ok) committed(target, summary);
      else setError(result.error);
    });
  }

  const choose = (type: AttendanceType, period: string | null) => {
    const choice: CellChoice = { kind: "record", type, period };
    run(() => actions.edit(name, date, choice), period ? `${type} ${period}` : type);
  };

  const planLabel = status.planned ? (status.added ? "있음(직접 추가)" : "있음(규칙)") : "없음";

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-1.5">
          <PopoverTitle className="text-sm font-semibold">
            {name} · {shortDate(date)}
          </PopoverTitle>
          <div className="flex flex-wrap gap-1 text-[11px] leading-[1.1rem]">
            <span className="rounded-full border bg-secondary px-1.5">근태: {status.current}</span>
            <span className="rounded-full border bg-muted px-1.5">리모트 계획: {planLabel}</span>
            <span
              className={cn(
                "rounded-full border px-1.5",
                status.interview ? "border-att-interview/45 bg-att-interview/15" : "bg-muted",
              )}
            >
              면담: {status.interview ? "켜짐" : "꺼짐"}
            </span>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon-xs" aria-label="닫기" onClick={close}>
          ✕
        </Button>
      </div>

      <Section title="근태 유형">
        {ATTENDANCE_TYPES.map((type) => {
          const periods = CELL_EDIT_PERIODS[type];
          const current = status.record?.type === type;
          return (
            <div key={type} className="grid">
              <button
                type="button"
                disabled={pending}
                aria-expanded={periods ? expanded === type : undefined}
                onClick={() => (periods ? setExpanded(expanded === type ? null : type) : choose(type, null))}
                className={cn(ROW, current && "shadow-[inset_0_0_0_1px_var(--foreground)]")}
              >
                <span aria-hidden className={cn(SWATCH, TYPE_COLOR[type])}>{TYPE_LETTER[type]}</span>
                {type === "리모트" ? "리모트 (근태 기록)" : type}
                {periods ? (
                  <span className="ml-auto text-[11px] text-muted-foreground">{expanded === type ? "▴" : "구분 ▾"}</span>
                ) : null}
              </button>
              {periods && expanded === type ? (
                <div className="flex flex-wrap gap-1 pt-0.5 pb-1 pl-[2.15rem]">
                  <span className="w-full text-[11px] text-muted-foreground">구분을 고르면 저장됩니다</span>
                  {periods.map((period) => (
                    <Button
                      key={period}
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={pending}
                      onClick={() => choose(type, period)}
                      className={cn(current && status.record?.period === period && "border-foreground bg-secondary")}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          disabled={pending || !status.record}
          onClick={() =>
            run(
              () => actions.edit(name, date, { kind: "clear" }),
              `기록 지움${status.planned ? " (리모트 계획이 다시 보임)" : ""}`,
            )
          }
          className={cn(ROW, "text-destructive")}
        >
          <span aria-hidden className={cn(SWATCH, "border border-dashed border-foreground/45")}>✕</span>
          기록 지우기{status.record ? "" : " (지울 기록 없음)"}
        </button>
      </Section>

      <Section
        title="리모트 계획"
        hint={
          status.record
            ? "근태 기록이 있어 칸에는 기록이 먼저 보입니다. 계획은 따로 바뀝니다."
            : status.planned
              ? "계획이 규칙에서 온 것이어도 해제할 수 있습니다."
              : "규칙에 없는 날에도 추가할 수 있습니다."
        }
      >
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => actions.setRemotePlan(name, date, !status.planned), `리모트 계획 ${status.planned ? "해제" : "추가"}`)
          }
          className={ACTION}
        >
          <span aria-hidden className="w-4 text-center font-bold">{status.planned ? "−" : "+"}</span>
          리모트 계획 {status.planned ? "해제" : "추가"}
        </Button>
      </Section>

      <Section title="면담" hint="근태 기록과 집계는 바뀌지 않습니다.">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => actions.setInterview(name, date, !status.interview), `면담 표시 ${status.interview ? "끔" : "켬"}`)
          }
          className={ACTION}
        >
          <span aria-hidden className="w-4 text-center font-bold">⚑</span>
          면담 표시 {status.interview ? "끄기" : "켜기"}
        </Button>
      </Section>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}
