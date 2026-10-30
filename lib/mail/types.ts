/** 메일 본문을 만드는 데 필요한 근태 기록 한 건. 비고는 받지 않는다(본문에 넣지 않기 때문이다). */
export type MailRecord = {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  type: string;
  period: string | null;
  time: string | null;
};

export type MailInput = {
  /** 본문을 만들 날짜(YYYY-MM-DD) */
  date: string;
  /** 팀원 명단(표시 순서) */
  roster: readonly string[];
  /** 그 날과 이후의 근태 기록(복귀일 계산에 이후 날짜가 필요하다) */
  records: readonly MailRecord[];
  /** 그 날 미확인(?)으로 표시된 사람의 이름 */
  unconfirmedNames: readonly string[];
  /** 그 날 면담이 켜진 사람의 이름. 근태와 집계에는 영향을 주지 않고 "오늘 면담" 구역만 만든다. */
  interviewNames?: readonly string[];
  /** 그 날 계획된 리모트 대상자. 근태 기록이나 미확인 표시가 있는 사람에게는 적용되지 않는다. */
  plannedNames?: readonly string[];
  /** 그 날이 휴일이면 휴일 이름(여럿이면 " · "로 이은 값), 아니면 null */
  holiday: string | null;
  /** 그 날의 행사 이름 */
  events: readonly string[];
  /** 복귀일을 계산할 때 건너뛸 휴일 날짜 */
  holidayDates: ReadonlySet<string>;
  /** 전체 현황 화면 링크 */
  linkUrl: string;
};

export type MailSummary = {
  present: number;
  remote: number;
  absent: number;
  morningHalf: number;
  unconfirmed: number;
  total: number;
};

export type MailPerson = { name: string; suffix: string | null };

export type MailGroup = { label: string | null; people: MailPerson[] };

export type MailSectionId = "unconfirmed" | "interview" | "absent" | "remote" | "morning-half" | "afternoon-half";

export type MailSection = {
  id: MailSectionId;
  title: string;
  count: number;
  groups: MailGroup[];
};

export type MailContent =
  | { kind: "weekend"; subject: ""; html: ""; text: ""; message: string }
  | { kind: "holiday"; subject: string; html: string; text: string; holiday: string }
  | {
      kind: "workday";
      subject: string;
      html: string;
      text: string;
      summary: MailSummary;
      events: string[];
      sections: MailSection[];
      /** 오후 반차·반반차 인원. 출근 인원 안에 들어 있다. */
      afternoonHalf: number;
    };
