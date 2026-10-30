"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { CellEditPopup } from "@/components/cell-edit-popup";
import { Button } from "@/components/ui/button";
import { shortDate, type AttendanceType, type CellChoice } from "@/lib/attendance";
import { cn } from "@/lib/utils";

type ActionResult = { ok: true } | { ok: false; error: string };

/** 팝업이 부르는 저장 요청. 모두 서버에서 관리자 잠금과 규칙을 다시 검사한다. */
export type CellEditActions = {
  edit: (name: string, date: string, choice: CellChoice) => Promise<ActionResult>;
  setRemotePlan: (name: string, date: string, planned: boolean) => Promise<ActionResult>;
  setInterview: (name: string, date: string, on: boolean) => Promise<ActionResult>;
};

/** 칸 한 개의 현재 상태. 팝업 위쪽에 알려 주고 기록 지우기·계획·면담 버튼을 정한다. */
export type CellStatus = {
  /** "휴가", "반차 오전", "미확인(?)", "기록 없음(출근)" 같은 칸의 현재 근태 표시 */
  current: string;
  record: { type: AttendanceType; period: string | null } | null;
  planned: boolean;
  /** 계획된 리모트 중 직접 추가한 것 */
  added: boolean;
  interview: boolean;
};

export type CellTarget = { name: string; date: string; anchor: HTMLElement; status: CellStatus };

type Tip = { text: string; rect: DOMRect };

type CellEditState = {
  mode: boolean;
  setMode: (on: boolean) => void;
  /** 표시줄에 남기는 "방금 바꿈" 내용 */
  last: string | null;
  target: CellTarget | null;
  flashed: { name: string; date: string } | null;
  actions: CellEditActions;
  open: (target: CellTarget) => void;
  close: () => void;
  showTip: (anchor: HTMLElement, text: string) => void;
  /** 저장이 끝났을 때: 팝업을 닫고 표시줄에 방금 바꾼 내용을 남기고 그 칸을 깜빡인다. */
  committed: (target: CellTarget, summary: string) => void;
};

const Context = createContext<CellEditState | null>(null);

export function useCellEdit(): CellEditState {
  const value = useContext(Context);
  if (!value) throw new Error("CellEditProvider 안에서만 쓸 수 있습니다.");
  return value;
}

const TIP_MS = 3500;
const FLASH_MS = 1200;

/**
 * 관리자 현황표의 수정 모드 상태를 쥔다. 켜면 칸 클릭이 토글 대신 수정 팝업을 연다.
 * 저장하지 않는 화면 상태라서 새로 고치거나 다른 화면으로 가면 꺼진다.
 */
export function CellEditProvider({ actions, children }: { actions: CellEditActions; children: ReactNode }) {
  const [mode, setModeState] = useState(false);
  const [target, setTarget] = useState<CellTarget | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [flashed, setFlashed] = useState<CellEditState["flashed"]>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);
  const later = (run: () => void, ms: number) => timers.current.push(window.setTimeout(run, ms));

  const value: CellEditState = {
    mode,
    setMode: (on) => {
      setModeState(on);
      if (!on) {
        setTarget(null);
        setTip(null);
      }
    },
    last,
    target,
    flashed,
    actions,
    open: (next) => {
      setTip(null);
      setTarget(next);
    },
    close: () => setTarget(null),
    showTip: (anchor, text) => {
      setTarget(null);
      setTip({ text, rect: anchor.getBoundingClientRect() });
      later(() => setTip(null), TIP_MS);
    },
    committed: (done, summary) => {
      setTarget(null);
      setLast(`${done.name} ${shortDate(done.date)} → ${summary}`);
      setFlashed({ name: done.name, date: done.date });
      later(() => setFlashed(null), FLASH_MS);
    },
  };

  return (
    <Context.Provider value={value}>
      {children}
      {tip ? (
        <div
          role="status"
          style={{
            position: "fixed",
            top: tip.rect.bottom + 6,
            left: Math.max(8, Math.min(tip.rect.left - 40, window.innerWidth - 232)),
          }}
          className="z-50 w-56 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md"
        >
          {tip.text}
        </div>
      ) : null}
      <CellEditPopup />
    </Context.Provider>
  );
}

/** 현황표 머리말의 "수정 모드" 스위치. */
export function EditModeSwitch() {
  const { mode, setMode } = useCellEdit();
  return (
    <div className="inline-flex items-center gap-2 text-sm font-medium">
      <span id="edit-mode-label">수정 모드</span>
      <button
        type="button"
        role="switch"
        aria-checked={mode}
        aria-labelledby="edit-mode-label"
        onClick={() => setMode(!mode)}
        className={cn(
          "relative h-5 w-9 shrink-0 cursor-pointer rounded-full border border-input p-0 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          mode ? "border-primary bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-px left-px size-4 rounded-full border border-input bg-background transition-transform",
            mode && "translate-x-4",
          )}
        />
      </button>
      {mode ? (
        <span className="rounded-full bg-primary px-1.5 text-[11px] leading-[1.1rem] font-semibold text-primary-foreground">
          수정 중
        </span>
      ) : null}
    </div>
  );
}

/** 수정 모드가 켜졌을 때만 현황표 위에 뜨는 어두운 표시줄. */
export function EditModeBar() {
  const { mode, setMode, last } = useCellEdit();
  if (!mode) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-primary px-3 py-2 text-[13px] text-primary-foreground"
    >
      <span>
        <b className="font-semibold">수정 모드 켜짐.</b> 칸을 누르면 수정 창이 열립니다. 출근 ↔ 미확인과 리모트 3단계
        토글은 꺼져 있습니다.
      </span>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => setMode(false)}
        className="border-primary-foreground/45 bg-transparent text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground dark:bg-transparent"
      >
        수정 모드 끄기
      </Button>
      {last ? <span className="basis-full text-xs opacity-80">방금 바꿈: {last}</span> : null}
    </div>
  );
}

/** 현황표를 감싼다. 수정 모드이면 표 테두리가 점선으로 바뀐다. */
export function EditModeFrame({ children }: { children: ReactNode }) {
  const { mode } = useCellEdit();
  return (
    <div className={cn("rounded-lg border-2", mode ? "border-dashed border-foreground" : "border-transparent")}>
      {children}
    </div>
  );
}

/**
 * 현황표 칸 하나의 내용을 감싼다. 수정 모드가 꺼져 있으면 아무 일도 하지 않고, 켜져 있으면 안쪽의
 * 토글·상세 버튼을 막고(inert) 칸을 눌렀을 때 수정 팝업을 연다. 수정할 수 없는 칸은 안내만 띄운다.
 */
export function EditTarget({
  name,
  date,
  status,
  blockedReason,
  children,
}: {
  name: string;
  date: string;
  status: CellStatus;
  /** 수정할 수 없는 칸(휴일, 소속 아님)이면 안내에 쓸 이유 */
  blockedReason?: string;
  children: ReactNode;
}) {
  const edit = useCellEdit();
  const ref = useRef<HTMLDivElement>(null);
  const blocked = blockedReason !== undefined;
  const isOpen = edit.target?.name === name && edit.target.date === date;
  const flashing = edit.flashed?.name === name && edit.flashed.date === date;

  function press() {
    if (!edit.mode || !ref.current) return;
    if (blocked) return edit.showTip(ref.current, blockedReason);
    edit.open({ name, date, anchor: ref.current, status });
  }

  return (
    <div
      ref={ref}
      role={edit.mode ? "button" : undefined}
      tabIndex={edit.mode ? 0 : undefined}
      aria-label={
        edit.mode ? `${name} ${shortDate(date)} ${status.current}, ${blocked ? blockedReason : "눌러서 수정"}` : undefined
      }
      aria-disabled={edit.mode && blocked ? true : undefined}
      data-edit-cell={edit.mode ? (blocked ? "blocked" : "editable") : undefined}
      onClick={press}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          press();
        }
      }}
      className={cn(
        "mx-auto size-5 rounded-sm",
        edit.mode &&
          !blocked &&
          "cursor-pointer hover:outline-2 hover:outline-offset-1 hover:outline-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        edit.mode && blocked && "cursor-not-allowed",
        isOpen && "outline-2 outline-offset-1 outline-foreground",
        flashing && "cell-flash",
      )}
    >
      <div inert={edit.mode}>{children}</div>
    </div>
  );
}
