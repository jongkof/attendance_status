export const ENTRY_KINDS = ["holiday", "event"] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

export const KIND_LABEL: Record<EntryKind, string> = { holiday: "휴일", event: "행사" };

/** 관리자가 등록한 휴일 또는 행사 한 건. 정부 공휴일의 처음 데이터도 같은 모양으로 저장된다. */
export type CalendarEntry = {
  id: number;
  /** YYYY-MM-DD */
  date: string;
  kind: EntryKind;
  name: string;
};

/** 날짜 하나에 붙는 휴일 이름과 행사 이름. */
export type DayMark = {
  /** 휴일이면 이름(여럿이면 " · "로 이음), 아니면 null */
  holiday: string | null;
  events: string[];
};

/** 규칙으로 계산되는 회사 휴일(저장하지 않는다). */
export type RuleHoliday = { date: string; name: string };
