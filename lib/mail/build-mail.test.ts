import { describe, expect, test } from "vitest";

import { buildMail } from "./build-mail";
import type { MailInput, MailRecord } from "./types";

const ROSTER = [
  "양ㅇㅇ", "홍ㅇㅇ", "이ㅇㅇ", "김ㅇㅇ", "박ㅇㅇ", "곽ㅇㅇ",
  "최ㅇㅇ", "임ㅇㅇ", "김ㅇㅇ2", "이ㅇㅇ2", "심ㅇㅇ", "최ㅇㅇ2",
  "이ㅇㅇ3", "장ㅇㅇ", "오ㅇㅇ", "유ㅇㅇ", "김ㅇㅇ3", "강ㅇㅇ",
  "한ㅇㅇ", "류ㅇㅇ", "김ㅇㅇ4", "윤ㅇㅇ",
];

function rec(name: string, date: string, type: string, extra: Partial<MailRecord> = {}): MailRecord {
  return { name, date, type, period: null, time: null, ...extra };
}

/** 같은 사람의 같은 유형을 여러 날짜에 걸쳐 만든다. */
function span(name: string, type: string, dates: string[], extra: Partial<MailRecord> = {}): MailRecord[] {
  return dates.map((date) => rec(name, date, type, extra));
}

function input(overrides: Partial<MailInput> = {}): MailInput {
  return {
    date: "2026-10-26",
    roster: ROSTER,
    records: [],
    unconfirmedNames: [],
    holiday: null,
    events: [],
    holidayDates: new Set(),
    linkUrl: "https://example.test/?month=2026-10",
    ...overrides,
  };
}

/** 2026-10-26(월) 예시 데이터: 리모트 4, 부재 6(휴가 3, 출장 1, 교육 2). */
const MONDAY: MailRecord[] = [
  rec("최ㅇㅇ", "2026-10-26", "출장"),
  rec("김ㅇㅇ4", "2026-10-26", "리모트"),
  rec("강ㅇㅇ", "2026-10-26", "리모트"),
  rec("한ㅇㅇ", "2026-10-26", "리모트"),
  rec("류ㅇㅇ", "2026-10-26", "리모트"),
  rec("김ㅇㅇ2", "2026-10-26", "휴가"),
  rec("윤ㅇㅇ", "2026-10-26", "휴가"),
  rec("심ㅇㅇ", "2026-10-26", "휴가"),
  ...span("이ㅇㅇ3", "교육", ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]),
  ...span("이ㅇㅇ2", "교육", ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"]),
  rec("이ㅇㅇ2", "2026-10-30", "출장"),
];

function workday(content: ReturnType<typeof buildMail>) {
  if (content.kind !== "workday") throw new Error(`근무일 본문이어야 합니다: ${content.kind}`);
  return content;
}

describe("집계와 제목", () => {
  test("근무일 하루를 5개 항목으로 나누고 합이 명단 인원수와 같다", () => {
    const { summary } = workday(buildMail(input({ records: MONDAY })));
    expect(summary).toEqual({ present: 12, remote: 4, absent: 6, morningHalf: 0, unconfirmed: 0, total: 22 });
    expect(summary.present + summary.remote + summary.absent + summary.morningHalf + summary.unconfirmed).toBe(ROSTER.length);
  });

  test("다른 날(10/27)은 그 날의 기록만으로 센다", () => {
    const { summary } = workday(buildMail(input({ date: "2026-10-27", records: MONDAY })));
    expect(summary).toMatchObject({ remote: 0, absent: 2, present: 20 }); // 이ㅇㅇ2, 이ㅇㅇ3만 그 날 기록이 있다
  });

  test("제목은 0이 아닌 항목만 미확인, 부재, 리모트 순으로 붙인다", () => {
    expect(buildMail(input({ records: MONDAY })).subject).toBe("[근태 현황] 10/26(월) · 부재 6 · 리모트 4");
    const onlyAbsent = buildMail(input({ records: [rec("최ㅇㅇ", "2026-10-26", "교육")] }));
    expect(onlyAbsent.subject).toBe("[근태 현황] 10/26(월) · 부재 1");
    expect(buildMail(input()).subject).toBe("[근태 현황] 10/26(월)");
    const withUnconfirmed = buildMail(input({ records: MONDAY, unconfirmedNames: ["홍ㅇㅇ"] }));
    expect(withUnconfirmed.subject).toBe("[근태 현황] 10/26(월) · 미확인 1 · 부재 6 · 리모트 4");
  });

  test("미확인은 출근에 넣지 않고 따로 센다", () => {
    const { summary } = workday(buildMail(input({ unconfirmedNames: ["홍ㅇㅇ", "양ㅇㅇ"] })));
    expect(summary).toMatchObject({ unconfirmed: 2, present: 20, total: 22 });
  });

  test("일정이 없는 사람과 출근 기록이 있는 사람은 출근이다", () => {
    const { summary } = workday(buildMail(input({ records: [rec("홍ㅇㅇ", "2026-10-26", "출근")] })));
    expect(summary.present).toBe(22);
  });

  test("명단에 없는 이름의 기록과 다른 날짜의 기록은 집계에 들어가지 않는다", () => {
    const { summary } = workday(
      buildMail(input({ records: [rec("홍길동", "2026-10-26", "휴가"), rec("최ㅇㅇ", "2026-10-27", "휴가")] })),
    );
    expect(summary).toMatchObject({ absent: 0, present: 22 });
  });
});

describe("구역과 이름 목록", () => {
  test("구역은 미확인, 부재, 리모트, 오전 반차·반반차, 오후 반차·반반차 순이고 인원이 없으면 나오지 않는다", () => {
    expect(workday(buildMail(input({ records: MONDAY }))).sections.map((section) => section.id)).toEqual(["absent", "remote"]);
    expect(workday(buildMail(input())).sections).toEqual([]);
  });

  test("부재는 휴가, 출장, 교육, 건강검진 순의 유형별로 모으고 이름은 명단 순서다", () => {
    const records = [...MONDAY, rec("양ㅇㅇ", "2026-10-26", "건강검진")];
    const absent = workday(buildMail(input({ records }))).sections.find((section) => section.id === "absent")!;
    expect(absent.title).toBe("부재 7명");
    expect(absent.groups.map((group) => [group.label, group.people.map((p) => p.name)])).toEqual([
      ["휴가", ["김ㅇㅇ2", "심ㅇㅇ", "윤ㅇㅇ"]],
      ["출장", ["최ㅇㅇ"]],
      ["교육", ["이ㅇㅇ2", "이ㅇㅇ3"]],
      ["건강검진", ["양ㅇㅇ"]],
    ]);
  });

  test("리모트는 유형 이름 없이 명단 순서의 이름만 모은다", () => {
    const remote = workday(buildMail(input({ records: MONDAY }))).sections.find((section) => section.id === "remote")!;
    expect(remote.title).toBe("리모트 4명");
    expect(remote.groups).toEqual([
      { label: null, people: ["강ㅇㅇ", "한ㅇㅇ", "류ㅇㅇ", "김ㅇㅇ4"].map((name) => ({ name, suffix: null })) },
    ]);
  });

  test("미확인은 맨 앞에 나오고 근태 기록이 있는 사람은 들어가지 않는다", () => {
    const content = workday(buildMail(input({ records: MONDAY, unconfirmedNames: ["홍ㅇㅇ", "최ㅇㅇ"] })));
    expect(content.sections[0]).toMatchObject({ id: "unconfirmed", title: "미확인 1명" });
    expect(content.sections[0].groups[0].people).toEqual([{ name: "홍ㅇㅇ", suffix: null }]);
  });
});

describe("복귀일", () => {
  const absentPeople = (content: ReturnType<typeof buildMail>) =>
    workday(content).sections.find((section) => section.id === "absent")!.groups.flatMap((group) => group.people);

  test("같은 유형이 이어지는 마지막 근무일을 (~M/D)로 붙이고, 사이에 다른 유형이 끼면 거기서 끊는다", () => {
    const people = absentPeople(buildMail(input({ records: MONDAY })));
    expect(people.find((p) => p.name === "이ㅇㅇ3")?.suffix).toBe("(~10/30)");
    // 10/30에 출장이 끼어 있어서 교육은 10/29에서 끊긴다.
    expect(people.find((p) => p.name === "이ㅇㅇ2")?.suffix).toBe("(~10/29)");
  });

  test("그 날 하루로 끝나거나, 이어지는 날이 다른 유형이면 붙이지 않는다", () => {
    const records = [rec("최ㅇㅇ", "2026-10-26", "출장"), ...span("최ㅇㅇ", "교육", ["2026-10-27", "2026-10-28"])];
    expect(absentPeople(buildMail(input({ records })))[0]).toEqual({ name: "최ㅇㅇ", suffix: null });
  });

  test("주말과 휴일은 건너뛰고 이어진 것으로 본다", () => {
    const records = [rec("최ㅇㅇ", "2026-10-08", "휴가"), rec("최ㅇㅇ", "2026-10-12", "휴가"), rec("최ㅇㅇ", "2026-10-13", "휴가")];
    const content = buildMail(input({ date: "2026-10-08", records, holidayDates: new Set(["2026-10-09"]) }));
    expect(absentPeople(content)[0].suffix).toBe("(~10/13)");
  });

  test("기록이 없는 근무일이 사이에 끼면 거기서 끊긴다", () => {
    const records = [rec("최ㅇㅇ", "2026-10-26", "휴가"), rec("최ㅇㅇ", "2026-10-28", "휴가")];
    expect(absentPeople(buildMail(input({ records })))[0].suffix).toBeNull();
  });
});

describe("반차와 반반차", () => {
  test("오전 반차·반반차는 오전 구역에 들어가 집계의 오전 반차 칸에 세고, 구간과 시간이 붙는다", () => {
    const records = [
      rec("양ㅇㅇ", "2026-10-26", "반차", { period: "오전" }),
      rec("홍ㅇㅇ", "2026-10-26", "반반차", { period: "오전1" }),
      rec("이ㅇㅇ", "2026-10-26", "반반차", { period: "오전2", time: "10:30-12:00" }),
    ];
    const content = workday(buildMail(input({ records })));
    expect(content.summary).toMatchObject({ morningHalf: 3, present: 19 });
    const section = content.sections.find((s) => s.id === "morning-half")!;
    expect(section.title).toBe("오전 반차·반반차 3명");
    expect(section.groups[0].people).toEqual([
      { name: "양ㅇㅇ", suffix: "(오전 반차)" },
      { name: "홍ㅇㅇ", suffix: "(반반차 오전1 09:00–11:00)" },
      { name: "이ㅇㅇ", suffix: "(반반차 오전2 10:30–12:00)" },
    ]);
  });

  test("오후 반차·반반차는 출근에 포함되고, 숫자 칸 없이 이름만 따로 보여 준다", () => {
    const records = [
      rec("오ㅇㅇ", "2026-10-26", "반차", { period: "오후" }),
      rec("유ㅇㅇ", "2026-10-26", "반반차", { period: "오후2" }),
    ];
    const content = workday(buildMail(input({ records })));
    expect(content.summary).toMatchObject({ morningHalf: 0, present: 22 });
    expect(content.afternoonHalf).toBe(2);
    const section = content.sections.find((s) => s.id === "afternoon-half")!;
    expect(section.title).toBe("오후 반차·반반차 2명 · 출근에 포함");
    expect(section.groups[0].people).toEqual([
      { name: "오ㅇㅇ", suffix: "(오후 반차)" },
      { name: "유ㅇㅇ", suffix: "(반반차 오후2 16:00–18:00)" },
    ]);
  });

  test("구간을 알 수 없는 반차는 추측하지 않고 오전으로 세며 구간 미정이라고 밝힌다", () => {
    const content = workday(buildMail(input({ records: [rec("양ㅇㅇ", "2026-10-26", "반차")] })));
    expect(content.summary.morningHalf).toBe(1);
    expect(content.sections[0].groups[0].people[0].suffix).toBe("(반차 구간 미정)");
  });
});

describe("휴일, 주말, 행사", () => {
  test("주말은 근무일이 아니라는 안내만 있고 복사할 본문이 없다", () => {
    const content = buildMail(input({ date: "2026-10-10" }));
    expect(content).toMatchObject({ kind: "weekend", subject: "", html: "", text: "" });
  });

  test("휴일은 집계와 목록 없이 쉬는 날 안내와 링크만 나온다", () => {
    const content = buildMail(input({ date: "2026-10-09", holiday: "한글날", records: MONDAY }));
    expect(content.kind).toBe("holiday");
    expect(content.subject).toBe("[근태 현황] 10/9(금) · 쉬는 날");
    expect(content.html).toContain("오늘은 쉬는 날입니다(한글날)");
    expect(content.html).toContain("https://example.test/?month=2026-10");
    expect(content.html).not.toContain("출근");
    expect(content.text).toContain("오늘은 쉬는 날입니다(한글날)");
  });

  test("행사가 있는 날은 본문 맨 위에 오늘 행사가 나오고 집계는 그대로다", () => {
    const content = workday(buildMail(input({ events: ["야유회", "체육대회"], records: MONDAY })));
    expect(content.events).toEqual(["야유회", "체육대회"]);
    expect(content.summary.absent).toBe(6);
    expect(content.html).toContain("오늘 행사: 야유회, 체육대회");
    expect(content.html.indexOf("오늘 행사")).toBeLessThan(content.html.indexOf("부재"));
    expect(content.text).toContain("오늘 행사: 야유회, 체육대회");
  });
});

describe("본문 HTML과 글자", () => {
  const content = () => workday(buildMail(input({ records: MONDAY, unconfirmedNames: ["홍ㅇㅇ"] })));

  test("제목줄, 집계 숫자, 구역 제목, 이름과 복귀일이 모두 들어 있다", () => {
    const { html } = content();
    expect(html).toContain("10/26(월) 근태 현황");
    for (const text of ["출근", "리모트", "부재", "오전 반차", "미확인", "부재 6명", "리모트 4명", "미확인 1명", "휴가", "김ㅇㅇ2", "(~10/29)", "(~10/30)"]) {
      expect(html).toContain(text);
    }
  });

  test("미확인 구역이 가장 먼저, 이어서 부재와 리모트 순서로 나온다", () => {
    const { html } = content();
    expect(html.indexOf("미확인 1명")).toBeLessThan(html.indexOf("부재 6명"));
    expect(html.indexOf("부재 6명")).toBeLessThan(html.indexOf("리모트 4명"));
  });

  test("맨 아래에 나머지 출근 인원과 현황 링크가 있다", () => {
    const { html, text } = content();
    expect(html).toContain("나머지 11명은 출근입니다");
    expect(html).toContain("전체 현황 보기");
    expect(html).toContain("https://example.test/?month=2026-10");
    expect(text).toContain("나머지 11명은 출근입니다");
    expect(text).toContain("https://example.test/?month=2026-10");
  });

  test("오후 반차 인원이 있으면 출근에 포함된다는 점을 밝힌다", () => {
    const records = [rec("오ㅇㅇ", "2026-10-26", "반차", { period: "오후" }), rec("유ㅇㅇ", "2026-10-26", "반반차", { period: "오후2" })];
    const { html } = workday(buildMail(input({ records })));
    expect(html).toContain("나머지 22명은 출근입니다(오후 반차 2명 포함)");
    expect(html).toContain("오후 반차·반반차 2명 · 출근에 포함");
  });

  test("글자만 있는 본문은 같은 내용을 줄 단위로 담는다", () => {
    const { text } = content();
    expect(text).toContain("10/26(월) 근태 현황");
    expect(text).toContain("집계: 출근 11 · 리모트 4 · 부재 6 · 오전 반차 0 · 미확인 1");
    expect(text).toContain("교육: 이ㅇㅇ2 (~10/29), 이ㅇㅇ3 (~10/30)");
    expect(text).toContain("리모트 4명");
  });

  test("이름과 행사 이름의 특수 문자는 HTML로 해석되지 않는다", () => {
    const records = [rec("<b>x</b>", "2026-10-26", "휴가"), rec("김ㅇㅇ", "2026-10-26", "휴가")];
    const out = workday(buildMail(input({ roster: [...ROSTER, "<b>x</b>"], records, events: ["<script>alert(1)</script>"] })));
    expect(out.html).not.toContain("<script>");
    expect(out.html).not.toContain("<b>x</b>");
    expect(out.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  test("근태 공지의 비고는 본문 어디에도 나오지 않는다", () => {
    const withNote = { ...rec("김ㅇㅇ2", "2026-10-26", "휴가"), note: "병원 진료 확인 필요" } as MailRecord;
    const out = workday(buildMail(input({ records: [withNote] })));
    expect(out.html).not.toContain("병원");
    expect(out.html).not.toContain("확인 필요");
    expect(out.text).not.toContain("병원");
  });
});

describe("계획된 리모트", () => {
  const workday = (overrides: Partial<MailInput> = {}) => buildMail(input({ date: "2026-10-27", ...overrides }));

  test("리모트 구역과 집계와 제목이 같은 수를 쓴다", () => {
    const mail = workday({ plannedNames: ["강ㅇㅇ", "한ㅇㅇ"], records: [rec("류ㅇㅇ", "2026-10-27", "리모트")] });
    if (mail.kind !== "workday") throw new Error("근무일 본문이어야 합니다");
    expect(mail.summary.remote).toBe(3);
    expect(mail.sections.find((section) => section.id === "remote")?.count).toBe(3);
    expect(mail.subject).toContain("리모트 3");
    const { present, remote, absent, morningHalf, unconfirmed, total } = mail.summary;
    expect(present + remote + absent + morningHalf + unconfirmed).toBe(total);
  });

  test("공지 기록과 겹치면 한 번만 세고, 휴가 기록이 있으면 기록이 우선한다", () => {
    const mail = workday({
      plannedNames: ["강ㅇㅇ", "한ㅇㅇ"],
      records: [rec("강ㅇㅇ", "2026-10-27", "리모트"), rec("한ㅇㅇ", "2026-10-27", "휴가")],
    });
    if (mail.kind !== "workday") throw new Error("근무일 본문이어야 합니다");
    expect(mail.summary.remote).toBe(1);
    expect(mail.summary.absent).toBe(1);
  });

  test("계획이 없으면 리모트 구역이 나오지 않고 이전과 같다", () => {
    const mail = workday();
    if (mail.kind !== "workday") throw new Error("근무일 본문이어야 합니다");
    expect(mail.sections.some((section) => section.id === "remote")).toBe(false);
    expect(mail.subject).not.toContain("리모트");
  });
});

describe("오늘 면담 구역", () => {
  const withInterview = (interviewNames: string[], rest: Partial<MailInput> = {}) =>
    workday(buildMail(input({ records: MONDAY, interviewNames, ...rest })));

  test("면담 대상자 이름이 미확인 다음, 부재 앞 구역에 명단 순서로 나온다", () => {
    const content = withInterview(["윤ㅇㅇ", "홍ㅇㅇ"], { unconfirmedNames: ["양ㅇㅇ"] });
    expect(content.sections.map((section) => section.id)).toEqual(["unconfirmed", "interview", "absent", "remote"]);
    const section = content.sections.find((entry) => entry.id === "interview")!;
    expect(section.title).toBe("오늘 면담 2명");
    expect(section.groups[0].people.map((person) => person.name)).toEqual(["홍ㅇㅇ", "윤ㅇㅇ"]);
    expect(content.html).toContain("오늘 면담 2명");
    expect(content.text).toContain("오늘 면담 2명");
  });

  test("대상자가 없으면 구역이 없다", () => {
    expect(withInterview([]).sections.map((section) => section.id)).toEqual(["absent", "remote"]);
  });

  test("명단에 없는 이름은 나오지 않는다", () => {
    expect(withInterview(["홍길동"]).sections.some((section) => section.id === "interview")).toBe(false);
  });

  test("집계 5개 항목과 제목, 다른 구역의 인원은 면담이 있어도 같고 같은 사람이 다른 구역에도 나온다", () => {
    const before = workday(buildMail(input({ records: MONDAY })));
    const after = withInterview(["윤ㅇㅇ", "강ㅇㅇ"]);
    expect(after.summary).toEqual(before.summary);
    expect(after.subject).toBe(before.subject);
    const people = (id: string) =>
      after.sections.find((section) => section.id === id)!.groups.flatMap((group) => group.people.map((person) => person.name));
    expect(people("absent")).toContain("윤ㅇㅇ");
    expect(people("remote")).toContain("강ㅇㅇ");
  });
});
