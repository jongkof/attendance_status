import {
  BODY_CELL,
  BODY_HEAD,
  CELL_BOX,
  groupTone,
  HEADER_HEAD,
  HOLIDAY_BOX,
  INTERVIEW_FLAG,
  NOT_MEMBER_BOX,
} from "@/components/attendance-style";
import { TableFrame } from "@/components/table-frame";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { focusDayOf, weekdayLabel } from "@/lib/attendance";
import type { DayMark } from "@/lib/calendar";
import type { RosterBlock } from "@/lib/remote";
import { ALWAYS, isActiveOn, type Tenure } from "@/lib/roster";
import { cn } from "@/lib/utils";

const STRIP_COLUMN_REM = 2.25;
const NAME_COLUMN_REM = 6;
const DAY_COLUMN_REM = 2.5;
const WEEK_BORDER = "border-l-2 border-foreground/25";

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/**
 * 면담 표. 리모트 표와 같은 모양(조 띠, 이름, 날짜 열, 주 경계선, 휴일 음영, 오늘 열 강조)에서
 * 칸을 눌러 그 사람·날짜의 면담을 켜고 끈다. 켜진 칸에는 현황표와 같은 플래그가 보인다.
 * 휴일 칸과 재직 기간이 아닌 칸은 눌리지 않는다. 근태 기록은 면담과 상관없어 보여 주지 않는다.
 */
export function InterviewTable({
  blocks,
  days,
  today,
  dayMarks,
  tenures,
  isInterview,
  disabled = false,
  onToggle,
}: {
  blocks: readonly RosterBlock[];
  days: readonly string[];
  today: string;
  dayMarks: Record<string, DayMark>;
  tenures: Readonly<Record<string, Tenure>>;
  isInterview: (name: string, date: string) => boolean;
  /** 저장 중에는 누를 수 없다 */
  disabled?: boolean;
  onToggle: (name: string, date: string, on: boolean) => void;
}) {
  const startsWeek = (day: string, index: number) => index > 0 && weekdayLabel(day) === "월";

  function cell(name: string, day: string) {
    const label = `${name} ${md(day)}`;
    if (!isActiveOn(tenures[name] ?? ALWAYS, day)) {
      return <div role="img" aria-label={`${label} 소속 아님`} title="소속 아님" className={cn(CELL_BOX, NOT_MEMBER_BOX)} />;
    }
    if (dayMarks[day]?.holiday) return <div role="img" aria-label={`${label} 휴일`} className={cn(CELL_BOX, HOLIDAY_BOX)} />;
    const on = isInterview(name, day);
    return (
      <button
        type="button"
        disabled={disabled}
        aria-pressed={on}
        aria-label={`${label} ${on ? "면담" : "면담 없음"}`}
        title={on ? "누르면 면담 해제" : "누르면 면담 지정"}
        onClick={() => onToggle(name, day, !on)}
        className={cn(
          CELL_BOX,
          "relative cursor-pointer hover:ring-2 hover:ring-foreground/50 disabled:cursor-wait",
          on ? "bg-att-interview/25" : "border border-input bg-background",
        )}
      >
        {on ? <span aria-hidden className={cn(INTERVIEW_FLAG, "size-3")} /> : null}
      </button>
    );
  }

  const focusDay = focusDayOf(days, today);
  // 조 없는 팀원 묶음은 조 배경 없이, 조는 두 톤을 번갈아 쓴다.
  let groupCount = 0;

  return (
    <TableFrame focusDay={focusDay}>
    <Table className="table-fixed" style={{ width: `${STRIP_COLUMN_REM + NAME_COLUMN_REM + days.length * DAY_COLUMN_REM}rem` }}>
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
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {blocks.map(({ name: groupName, members }) => {
          const tone = groupTone(groupName ? groupCount++ : null);
          return members.map((name, rowIndex) => (
            <TableRow key={name} className={cn(tone, rowIndex === 0 && "border-t-2 border-foreground/25")}>
              {rowIndex === 0 ? (
                <TableHead
                  rowSpan={members.length}
                  scope="rowgroup"
                  className="sticky left-0 z-10 border-r bg-muted/40 p-0 text-center align-middle"
                >
                  {groupName ? (
                    <span className="inline-block text-xs font-medium whitespace-nowrap [writing-mode:vertical-rl]">{groupName}</span>
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
                  {cell(name, day)}
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
