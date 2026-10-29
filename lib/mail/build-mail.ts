import { renderHolidayHtml, renderHolidayText, renderWorkdayHtml, renderWorkdayText } from "./render";
import type { MailContent, MailGroup, MailInput, MailPerson, MailRecord, MailSection, MailSummary } from "./types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 날짜 하나를 월/일(요일)로 쓴다. 예: 10/26(월) */
function monthDay(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

const ABSENT_ORDER = ["휴가", "출장", "교육", "건강검진"] as const;

/** 반반차 구간별 기본 시간. 근태 공지에 시간이 없을 때 쓴다. */
const QUARTER_HOURS: Record<string, string> = {
  오전1: "09:00–11:00",
  오전2: "10:00–12:00",
  오후1: "13:00–15:00",
  오후2: "16:00–18:00",
};

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** date부터 같은 사람의 같은 유형이 이어지는 마지막 근무일. 주말과 휴일은 건너뛴다. */
function lastDayOfRun(
  name: string,
  type: string,
  date: string,
  byKey: ReadonlyMap<string, MailRecord>,
  holidayDates: ReadonlySet<string>,
): string {
  let last = date;
  let cursor = date;
  for (let i = 0; i < 400; i += 1) {
    cursor = addDays(cursor, 1);
    const day = weekdayOf(cursor);
    if (day === 0 || day === 6 || holidayDates.has(cursor)) continue;
    const next = byKey.get(`${name}|${cursor}`);
    if (!next || next.type !== type) break;
    last = cursor;
  }
  return last;
}

function halfDaySuffix(record: MailRecord): string {
  if (record.type === "반차") {
    return record.period === "오전" || record.period === "오후" ? `(${record.period} 반차)` : "(반차 구간 미정)";
  }
  const period = record.period ?? "";
  if (!(period in QUARTER_HOURS)) return "(반반차 구간 미정)";
  const time = record.time ? record.time.replace("-", "–") : QUARTER_HOURS[period];
  return `(반반차 ${period} ${time})`;
}

type Category = "present" | "remote" | "absent" | "morning-half" | "afternoon-half";

const ABSENT_TYPES = new Set(["휴가", "출장", "교육", "건강검진"]);

/** 반차·반반차가 오전에 자리를 비우는지(오전)와 오후에 비우는지(오후)로 나눈다. 구간을 알 수 없으면 오전으로 본다. */
function classify(record: MailRecord | undefined): Category {
  if (!record) return "present";
  if (record.type === "리모트") return "remote";
  if (ABSENT_TYPES.has(record.type)) return "absent";
  if (record.type === "반차" || record.type === "반반차") {
    return record.period?.startsWith("오후") ? "afternoon-half" : "morning-half";
  }
  return "present";
}

/**
 * 근무일 하루의 메일 본문을 만든다. 저장하지 않고 입력만으로 계산한다.
 * 집계는 attendance-summary 결정을 따른다.
 */
export function buildMail(input: MailInput): MailContent {
  const day = weekdayOf(input.date);
  const label = `${monthDay(input.date)}(${WEEKDAYS[day]})`;

  if (day === 0 || day === 6) {
    return { kind: "weekend", subject: "", html: "", text: "", message: "주말은 근무일이 아니라서 만들 본문이 없습니다." };
  }
  if (input.holiday) {
    const title = `${label} 근태 현황`;
    return {
      kind: "holiday",
      subject: `[근태 현황] ${label} · 쉬는 날`,
      html: renderHolidayHtml(title, input.holiday, input.linkUrl),
      text: renderHolidayText(title, input.holiday, input.linkUrl),
      holiday: input.holiday,
    };
  }

  const roster = new Set(input.roster);
  const byName = new Map<string, MailRecord>();
  for (const record of input.records) {
    if (record.date === input.date && roster.has(record.name)) byName.set(record.name, record);
  }
  const unconfirmed = new Set(input.unconfirmedNames.filter((name) => roster.has(name) && !byName.has(name)));

  // 계획된 리모트는 기록도 미확인 표시도 없는 사람에게만 적용되고, 기록이 있으면 기록이 우선한다.
  const planned = new Set(input.plannedNames ?? []);
  const categoryOf = (name: string): Category => {
    const record = byName.get(name);
    return !record && planned.has(name) ? "remote" : classify(record);
  };

  const counts: Record<Category, number> = { present: 0, remote: 0, absent: 0, "morning-half": 0, "afternoon-half": 0 };
  let unconfirmedCount = 0;
  for (const name of input.roster) {
    if (unconfirmed.has(name)) unconfirmedCount += 1;
    else counts[categoryOf(name)] += 1;
  }

  const summary: MailSummary = {
    // 오후 반차·반반차는 아침 기준으로 출근이다.
    present: counts.present + counts["afternoon-half"],
    remote: counts.remote,
    absent: counts.absent,
    morningHalf: counts["morning-half"],
    unconfirmed: unconfirmedCount,
    total: input.roster.length,
  };

  const subject = [
    `[근태 현황] ${label}`,
    ...(summary.unconfirmed > 0 ? [`미확인 ${summary.unconfirmed}`] : []),
    ...(summary.absent > 0 ? [`부재 ${summary.absent}`] : []),
    ...(summary.remote > 0 ? [`리모트 ${summary.remote}`] : []),
  ].join(" · ");

  const byKey = new Map(input.records.map((record) => [`${record.name}|${record.date}`, record]));
  const section = (id: MailSection["id"], title: string, groups: MailGroup[]): MailSection[] => {
    const count = groups.reduce((sum, group) => sum + group.people.length, 0);
    return count === 0 ? [] : [{ id, title: `${title} ${count}명`, count, groups }];
  };
  const peopleIn = (category: Category, describe: (record: MailRecord) => string | null): MailPerson[] =>
    input.roster
      .filter((name) => !unconfirmed.has(name) && categoryOf(name) === category)
      .map((name) => ({ name, suffix: describe(byName.get(name)!) }));

  const absentGroups: MailGroup[] = ABSENT_ORDER.map((type) => ({
    label: type,
    people: input.roster
      .filter((name) => !unconfirmed.has(name) && byName.get(name)?.type === type)
      .map((name) => {
        const last = lastDayOfRun(name, type, input.date, byKey, input.holidayDates);
        return { name, suffix: last === input.date ? null : `(~${monthDay(last)})` };
      }),
  })).filter((group) => group.people.length > 0);

  const sections: MailSection[] = [
    ...section("unconfirmed", "미확인", [
      { label: null, people: input.roster.filter((name) => unconfirmed.has(name)).map((name) => ({ name, suffix: null })) },
    ]),
    ...section("absent", "부재", absentGroups),
    ...section("remote", "리모트", [{ label: null, people: peopleIn("remote", () => null) }]),
    ...section("morning-half", "오전 반차·반반차", [{ label: null, people: peopleIn("morning-half", halfDaySuffix) }]),
    ...section("afternoon-half", "오후 반차·반반차", [{ label: null, people: peopleIn("afternoon-half", halfDaySuffix) }]),
  ];
  const afternoon = sections.find((entry) => entry.id === "afternoon-half");
  if (afternoon) afternoon.title = `${afternoon.title} · 출근에 포함`;

  const rendered = {
    title: `${label} 근태 현황`,
    events: input.events,
    summary,
    sections,
    afternoonHalf: counts["afternoon-half"],
    linkUrl: input.linkUrl,
  };
  return {
    kind: "workday",
    subject,
    html: renderWorkdayHtml(rendered),
    text: renderWorkdayText(rendered),
    summary,
    events: [...input.events],
    sections,
    afternoonHalf: counts["afternoon-half"],
  };
}
