import { AttendanceCell } from "@/components/attendance-cell";
import {
  CELL_BOX,
  HOLIDAY_BOX,
  TYPE_COLOR,
  TYPE_LETTER,
  UNCONFIRMED_BOX,
} from "@/components/attendance-style";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnconfirmedToggleCell } from "@/components/unconfirmed-toggle-cell";
import {
  summarizeDay,
  type DaySummary,
  weekdayLabel,
  type AttendanceRecord,
  type UnconfirmedMark,
} from "@/lib/attendance";
import type { DayMark } from "@/lib/calendar";
import type { RosterBlock } from "@/lib/remote";
import { cn } from "@/lib/utils";

type ToggleResult =
  { ok: true; marked: boolean } | { ok: false; error: string };

const STRIP_COLUMN_REM = 2.25;
const NAME_COLUMN_REM = 6;
const DAY_COLUMN_REM = 2.5;
/** 금요일과 월요일 사이의 주 경계선 */
const WEEK_BORDER = "border-l-2 border-foreground/25";

const SUMMARY_ROWS: { key: keyof DaySummary; label: string }[] = [
  { key: "remote", label: "리모트" },
  { key: "present", label: "출근" },
  { key: "absent", label: "부재" },
  { key: "morningHalf", label: "오전 반차" },
  { key: "unconfirmed", label: "미확인" },
];

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
  blocks,
  planned = [],
  showSummary = false,
  today,
  toggle,
}: {
  roster: readonly string[];
  days: readonly string[];
  records: readonly AttendanceRecord[];
  unconfirmed?: readonly UnconfirmedMark[];
  /** 날짜별 휴일·행사 표시. 휴일 열은 근태를 보여 주지 않고 음영 칸이 된다. */
  dayMarks?: Record<string, DayMark>;
  /** 조 편성 묶음(미배정, 조 순서). 있으면 세로 조 띠와 조 사이 굵은 선이 생긴다. 없으면 명단 순서 그대로다. */
  blocks?: readonly RosterBlock[];
  /** 계획된 리모트 칸("이름|날짜"). 기록이나 미확인 표시가 없는 칸에 "리"로 채워진다. */
  planned?: readonly string[];
  /** 날짜별 집계 행을 아래에 붙인다(관리자용). */
  showSummary?: boolean;
  today: string;
  /** 주면 오늘과 지난 날짜의 일정 없는 칸을 눌러 미확인(?)을 켜고 끌 수 있다(관리자용). */
  toggle?: (name: string, date: string) => Promise<ToggleResult>;
}) {
  const byCell = new Map(
    records.map((record) => [`${record.name}|${record.date}`, record]),
  );
  const marked = new Set(
    unconfirmed.map((mark) => `${mark.name}|${mark.date}`),
  );
  // 첫 열은 주 경계선이 필요 없다.
  const plannedCells = new Set(planned);
  const hasStrip = blocks?.some((block) => block.name !== null) ?? false;
  const known = new Set(blocks?.flatMap((block) => block.members));
  const shown: RosterBlock[] = blocks
    ? [
        ...blocks,
        ...(roster.some((name) => !known.has(name))
          ? [{ name: null, members: roster.filter((name) => !known.has(name)) }]
          : []),
      ]
    : [{ name: null, members: [...roster] }];
  const nameLeft = hasStrip ? "left-9" : "left-0";
  const startsWeek = (day: string, index: number) =>
    index > 0 && weekdayLabel(day) === "월";

  // 집계는 휴일이 아닌 날만 낸다(attendance-summary 결정).
  const summaries: Record<string, DaySummary | null> = {};
  if (showSummary) {
    const everyone = shown.flatMap((block) => block.members);
    for (const day of days) {
      summaries[day] = dayMarks[day]?.holiday
        ? null
        : summarizeDay(
            everyone,
            records.filter((record) => record.date === day),
            unconfirmed
              .filter((mark) => mark.date === day)
              .map((mark) => mark.name),
            everyone.filter((name) => plannedCells.has(`${name}|${day}`)),
          );
    }
  }

  return (
    <Table
      className="table-fixed"
      style={{
        width: `${(hasStrip ? STRIP_COLUMN_REM : 0) + NAME_COLUMN_REM + days.length * DAY_COLUMN_REM}rem`,
      }}
    >
      <colgroup>
        {hasStrip ? <col style={{ width: `${STRIP_COLUMN_REM}rem` }} /> : null}
        <col style={{ width: `${NAME_COLUMN_REM}rem` }} />
        {days.map((day) => (
          <col key={day} style={{ width: `${DAY_COLUMN_REM}rem` }} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow>
          {hasStrip ? (
            <TableHead
              className="sticky left-0 z-10 bg-background"
              aria-label="조"
            />
          ) : null}
          <TableHead className={cn("sticky z-10 bg-background", nameLeft)}>
            이름
          </TableHead>
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
              <div className={cn(dayMarks[day]?.holiday && "text-destructive")}>
                {Number(day.slice(8, 10))}
              </div>
              <div
                className={cn(
                  "text-xs font-normal",
                  dayMarks[day]?.holiday
                    ? "text-destructive"
                    : "text-muted-foreground",
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
        {shown.map(({ name: groupName, members }) =>
          members.map((name, rowIndex) => (
            <TableRow
              key={name}
              className={cn(
                hasStrip && rowIndex === 0 && "border-t-2 border-foreground/25",
              )}
            >
              {hasStrip && rowIndex === 0 ? (
                <TableHead
                  rowSpan={members.length}
                  scope="rowgroup"
                  className="sticky left-0 z-10 border-r bg-muted/40 p-0 text-center align-middle"
                >
                  {groupName ? (
                    <span className="inline-block text-xs font-medium whitespace-nowrap [writing-mode:vertical-rl]">
                      {groupName}
                    </span>
                  ) : null}
                </TableHead>
              ) : null}
              <TableHead
                scope="row"
                className={cn(
                  "sticky z-10 bg-background font-medium whitespace-nowrap",
                  nameLeft,
                )}
              >
                {name}
              </TableHead>
              {days.map((day, index) => {
                const record = byCell.get(`${name}|${day}`);
                return (
                  <TableCell
                    key={day}
                    data-week-start={startsWeek(day, index) ? "" : undefined}
                    className={cn(
                      "p-0.5",
                      startsWeek(day, index) && WEEK_BORDER,
                      day === today && "bg-accent",
                    )}
                  >
                    {dayMarks[day]?.holiday ? (
                      <div
                        role="img"
                        aria-label={`${name} ${day} ${dayMarks[day].holiday} 휴일`}
                        className={cn(CELL_BOX, HOLIDAY_BOX)}
                      />
                    ) : record ? (
                      <AttendanceCell record={record} />
                    ) : plannedCells.has(`${name}|${day}`) &&
                      !marked.has(`${name}|${day}`) ? (
                      <div
                        role="img"
                        aria-label={`${name} ${day} 리모트(계획)`}
                        title="계획된 리모트"
                        className={cn(CELL_BOX, TYPE_COLOR.리모트)}
                      >
                        {TYPE_LETTER.리모트}
                      </div>
                    ) : toggle && day <= today ? (
                      <UnconfirmedToggleCell
                        name={name}
                        date={day}
                        marked={marked.has(`${name}|${day}`)}
                        toggle={toggle}
                      />
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
                      <div
                        role="img"
                        aria-label={`${name} ${day} 출근`}
                        className={cn(CELL_BOX, TYPE_COLOR.출근)}
                      />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          )),
        )}
      </TableBody>
      {showSummary ? (
        <TableFooter>
          {SUMMARY_ROWS.map(({ key, label }) => (
            <TableRow key={key}>
              <TableHead
                colSpan={hasStrip ? 2 : 1}
                scope="row"
                className={cn(
                  "sticky left-0 z-10 bg-background text-xs font-medium",
                )}
              >
                {label}
              </TableHead>
              {days.map((day, index) => (
                <TableCell
                  key={day}
                  data-week-start={startsWeek(day, index) ? "" : undefined}
                  className={cn(
                    "px-0.5 py-1 text-center text-xs",
                    startsWeek(day, index) && WEEK_BORDER,
                    day === today && "bg-accent",
                  )}
                >
                  {summaries[day] ? summaries[day][key] : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableFooter>
      ) : null}
    </Table>
  );
}
