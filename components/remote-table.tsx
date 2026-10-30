import { BODY_CELL, BODY_HEAD, groupTone, HEADER_HEAD, TYPE_COLOR } from "@/components/attendance-style";
import { TableFrame } from "@/components/table-frame";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { focusDayOf, weekdayLabel, type AttendanceRecord, type AttendanceType } from "@/lib/attendance";
import type { DayMark } from "@/lib/calendar";
import { mondayOf, type RemoteGroup } from "@/lib/remote";
import { cn } from "@/lib/utils";

/** 근태 기록이 있는 칸의 한 글자 표기. 출근은 녹색 칸만 보인다. */
const LETTER: Record<AttendanceType, string> = {
  출근: "",
  휴가: "휴",
  반차: "반",
  반반차: "반",
  리모트: "리",
  출장: "출",
  교육: "교",
  건강검진: "건",
};

const STRIP_COLUMN_REM = 2.25;
const NAME_COLUMN_REM = 6;
const DAY_COLUMN_REM = 2.75;
const WEEK_BORDER = "border-l-2 border-foreground/25";
const SQUARE = "mx-auto flex size-5 items-center justify-center rounded-sm text-[11px] font-semibold";

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/**
 * 리모트 표. 행은 팀원(미배정, 조 순서), 열은 그 달의 근무일이다.
 * 노란 칸은 리모트, 흰 칸은 리모트 아님이고 눌러서 바꾼다. 직접 고친 칸에는 점이 붙는다.
 * 휴일·리모트 없는 주·다른 근태 기록이 있는 칸은 눌리지 않는 회색 또는 그 근태의 색이다.
 * 날짜 머리글 아래 주별 체크는 그 주를 리모트 없는 주로 만든다.
 */
export function RemoteTable({
  groups,
  unassigned,
  days,
  today,
  dayMarks,
  records,
  isSkipWeek,
  isPlanned,
  isEdited,
  disabled = false,
  onToggleCell,
  onToggleWeek,
}: {
  groups: readonly RemoteGroup[];
  unassigned: readonly string[];
  days: readonly string[];
  today: string;
  dayMarks: Record<string, DayMark>;
  records: readonly AttendanceRecord[];
  isSkipWeek: (week: string) => boolean;
  isPlanned: (groupId: number | null, name: string, date: string) => boolean;
  /** 직접 고친 칸인지(점 표시) */
  isEdited: (name: string, date: string) => boolean;
  /** 저장 중에는 누를 수 없다 */
  disabled?: boolean;
  onToggleCell: (name: string, date: string, remote: boolean) => void;
  onToggleWeek: (week: string, skip: boolean) => void;
}) {
  const byCell = new Map(records.map((record) => [`${record.name}|${record.date}`, record]));
  const startsWeek = (day: string, index: number) => index > 0 && weekdayLabel(day) === "월";

  const weeks: { week: string; count: number; first: number }[] = [];
  days.forEach((day, index) => {
    const week = mondayOf(day);
    const last = weeks[weeks.length - 1];
    if (last?.week === week) last.count++;
    else weeks.push({ week, count: 1, first: index });
  });

  const blocks: { group: RemoteGroup | null; members: readonly string[] }[] = [];
  if (unassigned.length > 0) blocks.push({ group: null, members: unassigned });
  for (const group of groups) if (group.members.length > 0) blocks.push({ group, members: group.members });

  function cell(name: string, group: RemoteGroup | null, day: string) {
    const label = `${name} ${md(day)}`;
    const holiday = dayMarks[day]?.holiday;
    if (holiday) return <div role="img" aria-label={`${label} 휴일`} className={cn(SQUARE, "bg-muted")} />;
    const record = byCell.get(`${name}|${day}`);
    if (record) {
      return (
        <div
          role="img"
          aria-label={`${label} ${record.type}`}
          title={`${record.type} 기록이 우선합니다`}
          className={cn(SQUARE, TYPE_COLOR[record.type])}
        >
          {LETTER[record.type]}
        </div>
      );
    }
    if (isSkipWeek(mondayOf(day))) {
      return <div role="img" aria-label={`${label} 리모트 없는 주`} title="리모트 없는 주" className={cn(SQUARE, "bg-muted")} />;
    }
    const planned = isPlanned(group?.id ?? null, name, day);
    const edited = isEdited(name, day);
    return (
      <button
        type="button"
        disabled={disabled}
        aria-pressed={planned}
        aria-label={`${label} ${planned ? "리모트" : "리모트 아님"}${edited ? " (직접 수정)" : ""}`}
        title={planned ? "누르면 리모트 해제" : "누르면 리모트 지정"}
        onClick={() => onToggleCell(name, day, !planned)}
        className={cn(
          SQUARE,
          "relative cursor-pointer hover:ring-2 hover:ring-foreground/50 disabled:cursor-wait",
          planned ? "bg-att-remote" : "border border-input bg-background",
        )}
      >
        {edited ? <span aria-hidden className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-foreground" /> : null}
      </button>
    );
  }

  const focusDay = focusDayOf(days, today);
  // 조 없는 팀원 묶음(미배정)은 조 배경 없이, 조는 두 톤을 번갈아 쓴다.
  let groupCount = 0;

  return (
    <TableFrame focusDay={focusDay}>
    <Table
      className="table-fixed"
      style={{ width: `${STRIP_COLUMN_REM + NAME_COLUMN_REM + days.length * DAY_COLUMN_REM}rem` }}
    >
      <colgroup>
        <col style={{ width: `${STRIP_COLUMN_REM}rem` }} />
        <col style={{ width: `${NAME_COLUMN_REM}rem` }} />
        {days.map((day) => (
          <col key={day} style={{ width: `${DAY_COLUMN_REM}rem` }} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead className={cn("sticky left-0 z-10 bg-background", HEADER_HEAD)} aria-label="조" />
          <TableHead data-name-head="" className={cn("sticky left-9 z-10 bg-background", HEADER_HEAD)}>이름</TableHead>
          {days.map((day, index) => (
            <TableHead
              key={day}
              data-day={day}
              data-focus-day={day === focusDay ? "" : undefined}
              data-week-start={startsWeek(day, index) ? "" : undefined}
              aria-current={day === today ? "date" : undefined}
              className={cn(
                "px-0.5 text-center leading-4",
                HEADER_HEAD,
                startsWeek(day, index) && WEEK_BORDER,
                day === today && "bg-accent text-accent-foreground",
              )}
            >
              <div className={cn(dayMarks[day]?.holiday && "text-destructive")}>{Number(day.slice(8, 10))}</div>
              <div className={cn("text-xs font-normal", dayMarks[day]?.holiday ? "text-destructive" : "text-muted-foreground")}>
                {weekdayLabel(day)}
              </div>
              {dayMarks[day]?.holiday ? (
                <div title={dayMarks[day].holiday ?? undefined} className="truncate text-[10px] leading-tight font-normal text-destructive">
                  {dayMarks[day].holiday}
                </div>
              ) : null}
              {dayMarks[day]?.events.map((event) => (
                <div key={event} title={event} className="mt-0.5 truncate rounded-sm bg-accent px-0.5 text-[10px] leading-tight font-normal text-accent-foreground">
                  {event}
                </div>
              ))}
            </TableHead>
          ))}
        </TableRow>
        <TableRow>
          <TableHead colSpan={2} className="sticky left-0 z-10 h-auto bg-background py-0.5 text-xs font-medium">
            리모트 없음
          </TableHead>
          {weeks.map(({ week, count, first }) => (
            <TableHead key={week} colSpan={count} className={cn("h-auto py-0.5 text-center", first > 0 && WEEK_BORDER)}>
              <label className="inline-flex items-center gap-1 text-xs font-normal">
                {/* 휴일·행사 주는 처음부터 체크된 상태로 보이고, 풀면 자동 건너뜀보다 우선한다. */}
                <input
                  type="checkbox"
                  checked={isSkipWeek(week)}
                  disabled={disabled}
                  onChange={(event) => onToggleWeek(week, event.target.checked)}
                  aria-label={`${md(week)} 주 리모트 없음`}
                />
                {count > 1 ? `${md(week)} 주` : null}
              </label>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {blocks.map(({ group, members }) => {
          const tone = groupTone(group ? groupCount++ : null);
          return members.map((name, rowIndex) => (
            <TableRow key={name} className={cn(tone, rowIndex === 0 && "border-t-2 border-foreground/25")}>
              {rowIndex === 0 ? (
                <TableHead
                  rowSpan={members.length}
                  scope="rowgroup"
                  className="sticky left-0 z-10 border-r bg-muted/40 p-0 text-center align-middle"
                >
                  {group ? (
                    <span className="inline-block text-xs font-medium whitespace-nowrap [writing-mode:vertical-rl]">{group.name}</span>
                  ) : null}
                </TableHead>
              ) : null}
              <TableHead scope="row" className={cn("sticky left-9 z-10 bg-inherit font-medium whitespace-nowrap", BODY_HEAD)}>
                {name}
              </TableHead>
              {days.map((day, index) => (
                <TableCell
                  key={day}
                  data-day={day}
                  data-week-start={startsWeek(day, index) ? "" : undefined}
                  className={cn(BODY_CELL, startsWeek(day, index) && WEEK_BORDER, day === today && "bg-accent")}
                >
                  {cell(name, group, day)}
                </TableCell>
              ))}
            </TableRow>
          ));
        })}
      </TableBody>
    </Table>
    </TableFrame>
  );
}
