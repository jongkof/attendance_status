import { AttendanceCell } from "@/components/attendance-cell";
import { CELL_BOX, HOLIDAY_BOX, TYPE_COLOR, UNCONFIRMED_BOX } from "@/components/attendance-style";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnconfirmedToggleCell } from "@/components/unconfirmed-toggle-cell";
import { weekdayLabel, type AttendanceRecord, type UnconfirmedMark } from "@/lib/attendance";
import type { DayMark } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type ToggleResult = { ok: true; marked: boolean } | { ok: false; error: string };

const NAME_COLUMN_REM = 6;
const DAY_COLUMN_REM = 2.5;
/** 금요일과 월요일 사이의 주 경계선 */
const WEEK_BORDER = "border-l-2 border-foreground/25";

/**
 * 행은 팀원(명단 순서), 열은 그 달의 근무일(월–금)인 월간 현황표.
 * 일정이 없는 근무일은 출근(녹색)으로 보이고, 모든 날짜 열은 같은 너비를 쓴다.
 */
export function AttendanceTable({
  roster,
  days,
  records,
  unconfirmed = [],
  dayMarks = {},
  today,
  toggle,
}: {
  roster: readonly string[];
  days: readonly string[];
  records: readonly AttendanceRecord[];
  unconfirmed?: readonly UnconfirmedMark[];
  /** 날짜별 휴일·행사 표시. 휴일 열은 근태를 보여 주지 않고 음영 칸이 된다. */
  dayMarks?: Record<string, DayMark>;
  today: string;
  /** 주면 오늘과 지난 날짜의 일정 없는 칸을 눌러 미확인(?)을 켜고 끌 수 있다(관리자용). */
  toggle?: (name: string, date: string) => Promise<ToggleResult>;
}) {
  const byCell = new Map(records.map((record) => [`${record.name}|${record.date}`, record]));
  const marked = new Set(unconfirmed.map((mark) => `${mark.name}|${mark.date}`));
  // 첫 열은 주 경계선이 필요 없다.
  const startsWeek = (day: string, index: number) => index > 0 && weekdayLabel(day) === "월";

  return (
    <Table
      className="table-fixed"
      style={{ width: `${NAME_COLUMN_REM + days.length * DAY_COLUMN_REM}rem` }}
    >
      <colgroup>
        <col style={{ width: `${NAME_COLUMN_REM}rem` }} />
        {days.map((day) => (
          <col key={day} style={{ width: `${DAY_COLUMN_REM}rem` }} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-10 bg-background">이름</TableHead>
          {days.map((day, index) => (
            <TableHead
              key={day}
              data-week-start={startsWeek(day, index) ? "" : undefined}
              className={cn(
                "px-0.5 text-center",
                startsWeek(day, index) && WEEK_BORDER,
                day === today && "bg-accent text-accent-foreground",
              )}
              aria-current={day === today ? "date" : undefined}
            >
              <div className={cn(dayMarks[day]?.holiday && "text-destructive")}>{Number(day.slice(8, 10))}</div>
              <div
                className={cn(
                  "text-xs font-normal",
                  dayMarks[day]?.holiday ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {weekdayLabel(day)}
              </div>
              {dayMarks[day]?.holiday ? (
                <div
                  title={dayMarks[day].holiday ?? undefined}
                  className="truncate text-[10px] leading-tight font-normal text-destructive"
                >
                  {dayMarks[day].holiday}
                </div>
              ) : null}
              {dayMarks[day]?.events.map((event) => (
                <div
                  key={event}
                  title={event}
                  className="mt-0.5 truncate rounded-sm bg-accent px-0.5 text-[10px] leading-tight font-normal text-accent-foreground"
                >
                  {event}
                </div>
              ))}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {roster.map((name) => (
          <TableRow key={name}>
            <TableHead scope="row" className="sticky left-0 z-10 bg-background font-medium whitespace-nowrap">
              {name}
            </TableHead>
            {days.map((day, index) => {
              const record = byCell.get(`${name}|${day}`);
              return (
                <TableCell
                  key={day}
                  data-week-start={startsWeek(day, index) ? "" : undefined}
                  className={cn("p-0.5", startsWeek(day, index) && WEEK_BORDER, day === today && "bg-accent")}
                >
                  {dayMarks[day]?.holiday ? (
                    <div
                      role="img"
                      aria-label={`${name} ${day} ${dayMarks[day].holiday} 휴일`}
                      className={cn(CELL_BOX, HOLIDAY_BOX)}
                    />
                  ) : record ? (
                    <AttendanceCell record={record} />
                  ) : toggle && day <= today ? (
                    <UnconfirmedToggleCell name={name} date={day} marked={marked.has(`${name}|${day}`)} toggle={toggle} />
                  ) : marked.has(`${name}|${day}`) ? (
                    <div
                      role="img"
                      aria-label={`${name} ${day} 미확인`}
                      title="미확인"
                      className={cn(CELL_BOX, UNCONFIRMED_BOX)}
                    >
                      ?
                    </div>
                  ) : (
                    <div role="img" aria-label={`${name} ${day} 출근`} className={cn(CELL_BOX, TYPE_COLOR.출근)} />
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
