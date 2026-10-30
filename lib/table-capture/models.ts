import { weekdayLabel } from "@/lib/attendance";
import type { DayMark } from "@/lib/calendar";
import { mondayOf, type RosterBlock } from "@/lib/remote";
import { ALWAYS, isActiveOn, type Tenure } from "@/lib/roster";

import { CAPTURE_COLOR } from "./draw";
import type { CaptureCell, CaptureDay, CaptureTable } from "./types";

const BLANK: CaptureCell = { stroke: CAPTURE_COLOR.cellBorder };
const HOLIDAY: CaptureCell = { fill: CAPTURE_COLOR.holidayFill };
const REMOTE: CaptureCell = { fill: CAPTURE_COLOR.remoteFill, text: "리", textColor: CAPTURE_COLOR.remoteText };
const INTERVIEW: CaptureCell = { fill: CAPTURE_COLOR.interviewFill, flag: true };

function captureDays(days: readonly string[], dayMarks: Record<string, DayMark>): CaptureDay[] {
  return days.map((date, index) => ({
    date,
    day: Number(date.slice(8, 10)),
    weekday: weekdayLabel(date),
    holiday: dayMarks[date]?.holiday ?? null,
    weekStart: index > 0 && weekdayLabel(date) === "월",
  }));
}

const monthOf = (days: readonly string[]) => `${Number(days[0].slice(0, 4))}년 ${Number(days[0].slice(5, 7))}월`;

/**
 * 리모트 표를 이미지용 모양으로 바꾼다. 계획된 리모트만 그리고 근태 기록은 넣지 않는다.
 * 휴일과 리모트 없는 주의 칸은 회색이고, 리모트 없는 주는 그 주 위에 "리모트 없음"이 적힌다.
 * isPlanned의 groupId는 블록 순서대로 넘어온 groupIds[i]다(미배정은 null).
 */
export function remoteCaptureTable(input: {
  blocks: readonly RosterBlock[];
  groupIds: readonly (number | null)[];
  days: readonly string[];
  dayMarks: Record<string, DayMark>;
  isSkipWeek: (week: string) => boolean;
  isPlanned: (groupId: number | null, name: string, date: string) => boolean;
}): CaptureTable {
  const { days } = input;
  const bannerWeeks: { first: number; count: number }[] = [];
  days.forEach((day, index) => {
    if (!input.isSkipWeek(mondayOf(day))) return;
    const last = bannerWeeks[bannerWeeks.length - 1];
    if (last && mondayOf(days[last.first]) === mondayOf(day)) last.count++;
    else bannerWeeks.push({ first: index, count: 1 });
  });

  return {
    title: `${monthOf(days)} 리모트 일정`,
    days: captureDays(days, input.dayMarks),
    bannerWeeks,
    bannerText: "리모트 없음",
    blocks: input.blocks.map((block, blockIndex) => ({
      name: block.name,
      rows: block.members.map((name) => ({
        name,
        cells: days.map((day): CaptureCell => {
          if (input.dayMarks[day]?.holiday || input.isSkipWeek(mondayOf(day))) return HOLIDAY;
          return input.isPlanned(input.groupIds[blockIndex] ?? null, name, day) ? REMOTE : BLANK;
        }),
      })),
    })),
    legend: [
      { label: "리 = 리모트", cell: REMOTE },
      { label: "회색 = 휴일", cell: HOLIDAY },
    ],
  };
}

/** 면담 표를 이미지용 모양으로 바꾼다. 면담이 켜진 칸은 플래그가 보이고 재직 기간 밖 칸은 흐리다. */
export function interviewCaptureTable(input: {
  blocks: readonly RosterBlock[];
  days: readonly string[];
  dayMarks: Record<string, DayMark>;
  tenures: Readonly<Record<string, Tenure>>;
  isInterview: (name: string, date: string) => boolean;
}): CaptureTable {
  const { days } = input;
  return {
    title: `${monthOf(days)} 면담 일정`,
    days: captureDays(days, input.dayMarks),
    blocks: input.blocks.map((block) => ({
      name: block.name,
      rows: block.members.map((name) => ({
        name,
        cells: days.map((day): CaptureCell => {
          if (!isActiveOn(input.tenures[name] ?? ALWAYS, day)) return { ...BLANK, faded: true };
          if (input.dayMarks[day]?.holiday) return HOLIDAY;
          return input.isInterview(name, day) ? INTERVIEW : BLANK;
        }),
      })),
    })),
    legend: [
      { label: "표시 = 면담", cell: INTERVIEW },
      { label: "회색 = 휴일", cell: HOLIDAY },
    ],
  };
}
