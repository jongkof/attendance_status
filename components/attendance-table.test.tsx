import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AttendanceLegend } from "@/components/attendance-legend";
import { AttendanceTable } from "@/components/attendance-table";
import { weekdaysOfMonth, type AttendanceRecord } from "@/lib/attendance";

const days = weekdaysOfMonth(2026, 10);
const roster = ["양ㅇㅇ", "홍ㅇㅇ"];
const records: AttendanceRecord[] = [
  { name: "양ㅇㅇ", date: "2026-10-30", type: "건강검진", period: null, time: null, note: "확인 필요", receivedAt: "2026-10-26T16:52:00+09:00" },
];

function renderTable() {
  return render(<AttendanceTable roster={roster} days={days} records={records} today="2026-10-29" />);
}

describe("월간 현황표 표시", () => {
  test("금요일과 월요일 사이에만 주 경계가 생긴다(첫 열 제외, 10월은 4번)", () => {
    const { container } = renderTable();
    const headerBoundaries = container.querySelectorAll("thead th[data-week-start]");
    expect([...headerBoundaries].map((th) => th.textContent)).toEqual(["5월", "12월", "19월", "26월"]);
  });

  test("모든 날짜 열은 같은 너비이고, 일정이 없는 칸도 같은 구조의 칸을 가진다", () => {
    const { container } = renderTable();
    const widths = [...container.querySelectorAll("col")].slice(1).map((col) => (col as HTMLElement).style.width);
    expect(new Set(widths)).toEqual(new Set(["2.5rem"]));
    for (const row of container.querySelectorAll("tbody tr")) {
      expect(row.querySelectorAll("td")).toHaveLength(days.length);
    }
  });

  test("일정이 없는 근무일은 출근 칸(녹색)으로 보이고, 기록이 있는 칸은 유형 색을 쓴다", () => {
    renderTable();
    const empty = screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-29 출근" });
    expect(empty.className).toContain("bg-att-work");
    const trip = screen.getByRole("button", { name: /양ㅇㅇ 10\/30\(금\) 건강검진/ });
    expect(trip.className).toContain("bg-att-checkup");
    expect(trip).toHaveTextContent(/^건$/);
    expect(trip.getAttribute("title")).toContain("건강검진");
  });

  test("오늘 열의 머리글을 구별해 표시한다", () => {
    const { container } = renderTable();
    expect(container.querySelector('thead th[aria-current="date"]')?.textContent).toBe("29목");
  });

  test("미확인으로 표시된 일정 없는 칸은 공개 표에서 눌리지 않는 물음표 칸으로 보인다", () => {
    render(
      <AttendanceTable roster={roster} days={days} records={records} unconfirmed={[{ name: "홍ㅇㅇ", date: "2026-10-29" }]} today="2026-10-29" />,
    );
    const mark = screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-29 미확인" });
    expect(mark).toHaveTextContent("?");
    expect(mark.className).toContain("border-dashed");
    expect(screen.queryAllByRole("button", { name: /눌러서/ })).toHaveLength(0);
  });
});

describe("재직 기간과 소속 아님 칸", () => {
  const tenures = { 홍ㅇㅇ: { start: "2026-10-15", removedOn: null }, 양ㅇㅇ: { start: null, removedOn: "2026-10-30" } };

  test("재직 기간 밖 칸은 근태 없음(출근)과 구별되는 흐린 소속 아님 칸이고 눌러서 바꿀 수 없다", () => {
    const toggle = vi.fn(async () => ({ ok: true as const, marked: true }));
    render(<AttendanceTable roster={roster} days={days} records={records} today="2026-10-29" tenures={tenures} toggle={toggle} />);
    const before = screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-14 소속 아님" });
    expect(before.className).toContain("opacity-40");
    expect(before.className).not.toContain("bg-att-work");
    expect(screen.getByRole("img", { name: "양ㅇㅇ 2026-10-30 소속 아님" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /홍ㅇㅇ 2026-10-14/ })).toBeNull();
    expect(screen.getByRole("button", { name: /홍ㅇㅇ 2026-10-15 출근/ })).toBeEnabled();
  });

  test("집계는 그날 재직 중인 팀원만 세어 합이 재직 인원과 같다", () => {
    const { container } = render(
      <AttendanceTable roster={roster} days={days} records={[]} today="2026-10-29" tenures={tenures} showSummary />,
    );
    const column = days.indexOf("2026-10-14") + 1;
    const total = (day: number) =>
      [...container.querySelectorAll("tfoot tr")].reduce((sum, row) => sum + Number(row.children[day]?.textContent || 0), 0);
    expect(total(column)).toBe(1);
    expect(total(days.indexOf("2026-10-15") + 1)).toBe(2);
    expect(total(days.indexOf("2026-10-30") + 1)).toBe(1);
  });
});

describe("관리자 표의 미확인 토글", () => {
  const toggle = vi.fn(async () => ({ ok: true as const, marked: true }));

  function renderAdmin() {
    toggle.mockClear();
    return render(
      <AttendanceTable
        roster={roster}
        days={days}
        records={records}
        unconfirmed={[{ name: "홍ㅇㅇ", date: "2026-10-28" }]}
        today="2026-10-29"
        toggle={toggle}
      />,
    );
  }

  test("오늘과 지난 날짜의 일정 없는 칸만 눌러서 바꿀 수 있다", () => {
    renderAdmin();
    expect(screen.getByRole("button", { name: "홍ㅇㅇ 2026-10-29 출근, 눌러서 미확인으로 표시" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "홍ㅇㅇ 2026-10-28 미확인, 눌러서 출근으로 되돌리기" })).toHaveAttribute("aria-pressed", "true");
    // 오늘보다 뒤 날짜와 근태 기록이 있는 칸은 버튼이 아니다.
    expect(screen.queryByRole("button", { name: /홍ㅇㅇ 2026-10-30/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /양ㅇㅇ 2026-10-30/ })).toBeNull();
  });

  test("눌러서 바꿀 수 있는 칸은 포인터, 호버 테두리, 다음 상태 툴팁을 보인다", () => {
    renderAdmin();
    const work = screen.getByRole("button", { name: /홍ㅇㅇ 2026-10-29 출근/ });
    expect(work.className).toContain("cursor-pointer");
    expect(work.className).toContain("hover:ring-2");
    expect(work).toHaveAttribute("title", "누르면 미확인으로");
    expect(screen.getByRole("button", { name: /홍ㅇㅇ 2026-10-28 미확인/ })).toHaveAttribute("title", "누르면 출근으로");
  });

  test("칸을 누르면 그 이름과 날짜로 토글을 요청한다", async () => {
    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: "홍ㅇㅇ 2026-10-29 출근, 눌러서 미확인으로 표시" }));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith("홍ㅇㅇ", "2026-10-29"));
  });

  test("서버가 거절하면 그 이유를 칸에 보여 준다", async () => {
    toggle.mockResolvedValueOnce({ ok: false as unknown as true, error: "거절됨" } as never);
    renderAdmin();
    const cell = screen.getByRole("button", { name: "홍ㅇㅇ 2026-10-29 출근, 눌러서 미확인으로 표시" });
    fireEvent.click(cell);
    await waitFor(() => expect(cell).toHaveAttribute("title", "거절됨"));
  });
});

describe("휴일과 행사 표시", () => {
  const marks = {
    "2026-10-09": { holiday: "한글날", events: [] },
    "2026-10-22": { holiday: null, events: ["야유회"] },
  };
  const withRecords: AttendanceRecord[] = [
    { name: "양ㅇㅇ", date: "2026-10-09", type: "휴가", period: null, time: null, note: "휴가 기간에 걸친 날", receivedAt: "2026-10-08T09:00:00+09:00" },
    { name: "양ㅇㅇ", date: "2026-10-08", type: "휴가", period: null, time: null, note: null, receivedAt: "2026-10-08T09:00:00+09:00" },
  ];

  function renderMarked(extra: Partial<Parameters<typeof AttendanceTable>[0]> = {}) {
    return render(
      <AttendanceTable
        roster={roster}
        days={days}
        records={withRecords}
        today="2026-10-29"
        dayMarks={marks}
        {...extra}
      />,
    );
  }

  test("휴일 열은 머리글의 날짜와 요일이 빨간 글씨이고 휴일 이름이 붙는다", () => {
    const { container } = renderMarked();
    const header = [...container.querySelectorAll("thead th")].find((th) => th.textContent?.startsWith("9금"));
    expect(header?.textContent).toContain("한글날");
    expect(header?.querySelector(".text-destructive")).not.toBeNull();
    const normal = [...container.querySelectorAll("thead th")].find((th) => th.textContent?.startsWith("8목"));
    expect(normal?.querySelector(".text-destructive")).toBeNull();
  });

  test("휴일 열의 칸은 근태 기록이 있어도 음영이 진 빈칸이고, 기록은 보이지 않는다", () => {
    renderMarked();
    expect(screen.queryByRole("button", { name: /양ㅇㅇ 10\/09/ })).toBeNull();
    const shaded = screen.getByRole("img", { name: "양ㅇㅇ 2026-10-09 한글날 휴일" });
    expect(shaded.className).toContain("bg-muted");
    expect(shaded).toBeEmptyDOMElement();
    // 휴일이 아닌 날의 기록은 그대로 보인다.
    expect(screen.getByRole("button", { name: /양ㅇㅇ 10\/08\(목\) 휴가/ })).toBeInTheDocument();
  });

  test("휴일 열의 칸에는 일정 없는 칸의 기본 녹색이 적용되지 않는다", () => {
    renderMarked();
    expect(screen.queryByRole("img", { name: "홍ㅇㅇ 2026-10-09 출근" })).toBeNull();
    expect(screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-08 출근" }).className).toContain("bg-att-work");
  });

  test("행사 이름은 머리글에만 붙고 그 열의 칸은 평소와 같다", () => {
    const { container } = renderMarked();
    const header = [...container.querySelectorAll("thead th")].find((th) => th.textContent?.startsWith("22목"));
    expect(header?.textContent).toContain("야유회");
    expect(header?.querySelector(".text-destructive")).toBeNull();
    expect(screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-22 출근" }).className).toContain("bg-att-work");
  });

  test("휴일에 저장되어 있던 미확인 표시는 보이지 않는다", () => {
    renderMarked({ unconfirmed: [{ name: "홍ㅇㅇ", date: "2026-10-09" }] });
    expect(screen.queryByRole("img", { name: /홍ㅇㅇ 2026-10-09 미확인/ })).toBeNull();
    expect(screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-09 한글날 휴일" })).toBeInTheDocument();
  });

  test("관리자 표에서도 휴일 칸은 눌러서 바꿀 수 있는 버튼이 아니다", () => {
    renderMarked({ toggle: async () => ({ ok: true as const, marked: true }) });
    expect(screen.queryByRole("button", { name: /홍ㅇㅇ 2026-10-09/ })).toBeNull();
    expect(screen.getByRole("button", { name: /홍ㅇㅇ 2026-10-08 출근, 눌러서/ })).toBeInTheDocument();
  });
});

describe("한 글자 칸 표기", () => {
  const rec = (date: string, type: AttendanceRecord["type"], period: string | null = null, time: string | null = null, note: string | null = null): AttendanceRecord => ({
    name: "양ㅇㅇ", date, type, period, time, note, receivedAt: "2026-10-26T09:00:00+09:00",
  });
  const typed: [AttendanceRecord, string, string][] = [
    [rec("2026-10-01", "휴가"), "휴", "bg-att-leave"],
    [rec("2026-10-02", "반차", "오전"), "반", "bg-att-half"],
    [rec("2026-10-05", "반반차", "오후2"), "반", "bg-att-half"],
    [rec("2026-10-06", "리모트"), "리", "bg-att-remote"],
    [rec("2026-10-07", "출장"), "출", "bg-att-trip"],
    [rec("2026-10-08", "교육"), "교", "bg-att-training"],
    [rec("2026-10-12", "건강검진", null, "09:00", "내과"), "건", "bg-att-checkup"],
  ];

  test("근태 유형마다 한 글자와 유형 색이 보이고, 자세한 구분은 마우스 올림 설명에 있다", () => {
    render(<AttendanceTable roster={roster} days={days} records={typed.map(([r]) => r)} today="2026-10-29" />);
    for (const [record, letter, color] of typed) {
      const cell = screen.getByRole("button", { name: new RegExp(`양ㅇㅇ ${record.date.slice(5, 7)}/${record.date.slice(8, 10)}`) });
      expect(cell).toHaveTextContent(new RegExp(`^${letter}$`));
      expect(cell.className).toContain(color);
      expect(cell.getAttribute("title")).toContain(record.period ? `${record.type} ${record.period}` : record.type);
    }
    expect(screen.getByRole("button", { name: /10\/12/ }).getAttribute("title")).toContain("09:00 · 내과");
  });

  test("칸은 작은 정사각형이고 출근 칸에는 글자가 없다", () => {
    renderTable();
    const empty = screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-29 출근" });
    expect(empty.className).toContain("size-6");
    expect(empty).toBeEmptyDOMElement();
  });

  test("범례가 같은 한 글자 표기를 쓴다", () => {
    render(<AttendanceLegend />);
    const letterOf = (label: string) => screen.getByText(label).closest("li")?.firstElementChild?.textContent?.trim();
    expect(letterOf("출근(일정 없음)")).toBe("");
    expect(letterOf("휴가")).toBe("휴");
    expect(letterOf("반차·반반차")).toBe("반");
    expect(letterOf("리모트")).toBe("리");
    expect(letterOf("출장")).toBe("출");
    expect(letterOf("교육")).toBe("교");
    expect(letterOf("건강검진")).toBe("건");
    expect(letterOf("미확인")).toBe("?");
  });
});

describe("조 편성과 계획된 리모트", () => {
  const blocks = [
    { name: null, members: ["홍ㅇㅇ"] },
    { name: "1조", members: ["양ㅇㅇ"] },
  ];

  test("조 편성 순서로 그리고 미배정은 라벨 없이 맨 위, 조에는 세로 띠 라벨과 굵은 구분선이 붙는다", () => {
    const { container } = render(
      <AttendanceTable roster={["양ㅇㅇ", "홍ㅇㅇ"]} blocks={blocks} days={days} records={[]} today="2026-10-29" />,
    );
    const rows = [...container.querySelectorAll("tbody tr")];
    expect(rows.map((row) => row.querySelector('th[scope="row"]')?.textContent)).toEqual(["홍ㅇㅇ", "양ㅇㅇ"]);
    const strips = [...container.querySelectorAll('th[scope="rowgroup"]')];
    expect(strips.map((strip) => strip.textContent)).toEqual(["", "1조"]);
    expect(rows.every((row) => row.className.includes("border-t-2"))).toBe(true);
  });

  test("블록이 없으면 띠도 구분선도 없이 이전 모양이다", () => {
    const { container } = renderTable();
    expect(container.querySelector('th[scope="rowgroup"]')).toBeNull();
    expect(container.querySelector("tbody tr")?.className ?? "").not.toContain("border-t-2");
  });

  test("계획된 리모트 칸은 '리'로 채워지고, 기록이 있으면 기록이 보이고, 휴일은 음영이다", () => {
    render(
      <AttendanceTable
        roster={["양ㅇㅇ", "홍ㅇㅇ"]}
        days={days}
        records={records}
        planned={["홍ㅇㅇ|2026-10-27", "양ㅇㅇ|2026-10-30", "홍ㅇㅇ|2026-10-09"]}
        dayMarks={{ "2026-10-09": { holiday: "한글날", events: [] } }}
        today="2026-10-29"
      />,
    );
    const planned = screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-27 리모트(계획)" });
    expect(planned).toHaveTextContent(/^리$/);
    expect(planned.className).toContain("bg-att-remote");
    expect(screen.queryByRole("img", { name: /양ㅇㅇ 2026-10-30 리모트/ })).toBeNull();
    expect(screen.getByRole("button", { name: /양ㅇㅇ 10\/30\(금\) 건강검진/ })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /홍ㅇㅇ 2026-10-09 리모트/ })).toBeNull();
  });

  test("집계 행은 계획된 리모트를 리모트에 세고 합이 명단 인원수와 같다", () => {
    const { container } = render(
      <AttendanceTable
        roster={["양ㅇㅇ", "홍ㅇㅇ"]}
        days={["2026-10-27"]}
        records={[]}
        planned={["홍ㅇㅇ|2026-10-27"]}
        showSummary
        today="2026-10-29"
      />,
    );
    const counts = Object.fromEntries(
      [...container.querySelectorAll("tfoot tr")].map((row) => [row.querySelector("th")?.textContent, Number(row.querySelector("td")?.textContent)]),
    );
    expect(counts).toEqual({ 리모트: 1, 출근: 1, 부재: 0, "오전 반차": 0, 미확인: 0 });
  });

  test("직접 추가한 리모트 칸은 \"리+\"로 구별해 보인다", () => {
    render(
      <AttendanceTable
        roster={["홍ㅇㅇ"]}
        days={["2026-10-27", "2026-10-28"]}
        records={[]}
        planned={["홍ㅇㅇ|2026-10-27", "홍ㅇㅇ|2026-10-28"]}
        added={["홍ㅇㅇ|2026-10-28"]}
        today="2026-10-29"
      />,
    );
    expect(screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-27 리모트(계획)" })).toHaveTextContent(/^리$/);
    expect(screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-28 리모트(직접 추가)" })).toHaveTextContent("리+");
  });
});

describe("관리자 표의 아침 확인 3단계 토글", () => {
  const toggleMorning = vi.fn(async () => ({ ok: true as const, state: "present" as const }));
  const remoteRecord = (name: string, date: string) => ({
    name,
    date,
    type: "리모트" as const,
    period: null,
    time: null,
    note: null,
    receivedAt: "2026-10-28T00:00:00Z",
  });

  function renderMorning(extra: Partial<React.ComponentProps<typeof AttendanceTable>> = {}) {
    toggleMorning.mockClear();
    return render(
      <AttendanceTable
        roster={["양ㅇㅇ", "홍ㅇㅇ"]}
        days={["2026-10-09", "2026-10-28", "2026-10-29", "2026-10-30"]}
        records={[remoteRecord("양ㅇㅇ", "2026-10-29"), remoteRecord("양ㅇㅇ", "2026-10-30")]}
        planned={["홍ㅇㅇ|2026-10-28", "홍ㅇㅇ|2026-10-30", "홍ㅇㅇ|2026-10-09"]}
        dayMarks={{ "2026-10-09": { holiday: "한글날", events: [] } }}
        today="2026-10-29"
        toggle={async () => ({ ok: true as const, marked: true })}
        toggleMorning={toggleMorning}
        {...extra}
      />,
    );
  }

  test("계획된 리모트와 기록 리모트 칸 모두 단서(포인터, 호버 테두리, 다음 상태 툴팁)를 보이고 눌린다", async () => {
    renderMorning();
    const planned = screen.getByRole("button", { name: /홍ㅇㅇ 2026-10-28 리모트/ });
    const recorded = screen.getByRole("button", { name: /양ㅇㅇ 2026-10-29 리모트/ });
    for (const cell of [planned, recorded]) {
      expect(cell.className).toContain("cursor-pointer");
      expect(cell.className).toContain("hover:ring-2");
      expect(cell).toHaveAttribute("title", "누르면 출근으로");
    }
    fireEvent.click(recorded);
    await waitFor(() => expect(toggleMorning).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-29"));
  });

  test("미래 칸과 휴일 칸은 눌리지 않는다", () => {
    renderMorning();
    expect(screen.queryByRole("button", { name: /2026-10-30/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /2026-10-09/ })).toBeNull();
  });

  test("리모트가 아닌 근태 기록 칸은 눌리지 않고, 일정 없는 칸은 기존 출근↔미확인 토글을 쓴다", () => {
    renderMorning({
      records: [{ ...remoteRecord("양ㅇㅇ", "2026-10-29"), type: "휴가" }],
    });
    expect(screen.queryByRole("button", { name: /양ㅇㅇ 2026-10-29 (리모트|출근|미확인)/ })).toBeNull();
    expect(screen.getByRole("button", { name: "홍ㅇㅇ 2026-10-29 출근, 눌러서 미확인으로 표시" })).toBeEnabled();
  });

  test("확인 결과대로 칸이 출근(녹색)과 미확인(?)으로 보이고 단서가 다음 상태를 알린다", () => {
    renderMorning({
      confirmations: [
        { name: "양ㅇㅇ", date: "2026-10-29", result: "present" },
        { name: "홍ㅇㅇ", date: "2026-10-28", result: "unconfirmed" },
      ],
    });
    const present = screen.getByRole("button", { name: /양ㅇㅇ 2026-10-29 출근/ });
    expect(present.className).toContain("bg-att-work");
    expect(present).toHaveAttribute("title", "누르면 미확인(?)으로");
    const unconfirmed = screen.getByRole("button", { name: /홍ㅇㅇ 2026-10-28 미확인/ });
    expect(unconfirmed).toHaveTextContent("?");
    expect(unconfirmed).toHaveAttribute("title", "누르면 리모트로");
  });

  test("공개 표는 확인 결과를 보여 주되 눌리지 않고, 집계는 출근·미확인으로 세며 합이 명단 인원수와 같다", () => {
    const { container } = render(
      <AttendanceTable
        roster={["양ㅇㅇ", "홍ㅇㅇ", "김ㅇㅇ"]}
        days={["2026-10-28"]}
        records={[remoteRecord("양ㅇㅇ", "2026-10-28")]}
        planned={["홍ㅇㅇ|2026-10-28", "김ㅇㅇ|2026-10-28"]}
        confirmations={[
          { name: "양ㅇㅇ", date: "2026-10-28", result: "present" },
          { name: "홍ㅇㅇ", date: "2026-10-28", result: "unconfirmed" },
        ]}
        showSummary
        today="2026-10-29"
      />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("img", { name: "양ㅇㅇ 2026-10-28 출근" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "홍ㅇㅇ 2026-10-28 미확인" })).toBeInTheDocument();
    const counts = Object.fromEntries(
      [...container.querySelectorAll("tfoot tr")].map((row) => [row.querySelector("th")?.textContent, Number(row.querySelector("td")?.textContent)]),
    );
    expect(counts).toEqual({ 리모트: 1, 출근: 1, 부재: 0, "오전 반차": 0, 미확인: 1 });
  });
});

describe("면담 플래그", () => {
  const holidayMarks = { "2026-10-09": { holiday: "한글날", events: [] } };
  const interviews = [
    { name: "양ㅇㅇ", date: "2026-10-30" }, // 근태 기록 칸
    { name: "홍ㅇㅇ", date: "2026-10-27" }, // 계획된 리모트 칸
    { name: "홍ㅇㅇ", date: "2026-10-28" }, // 미확인 칸
    { name: "홍ㅇㅇ", date: "2026-10-29" }, // 일정 없는 칸
    { name: "홍ㅇㅇ", date: "2026-10-09" }, // 휴일 칸
    { name: "양ㅇㅇ", date: "2026-10-01" }, // 소속 아님 칸
  ];
  const flags = () => screen.queryAllByRole("img").filter((element) => element.getAttribute("title") === "면담");

  function renderFlagged(admin: boolean) {
    return render(
      <AttendanceTable
        roster={roster}
        days={days}
        records={records}
        unconfirmed={[{ name: "홍ㅇㅇ", date: "2026-10-28" }]}
        planned={["홍ㅇㅇ|2026-10-27"]}
        dayMarks={holidayMarks}
        tenures={{ 양ㅇㅇ: { start: "2026-10-02", removedOn: null } }}
        interviews={interviews}
        today="2026-10-29"
        showSummary={admin}
        toggle={admin ? vi.fn(async () => ({ ok: true as const, marked: true })) : undefined}
        toggleMorning={admin ? vi.fn(async () => ({ ok: true as const, state: "present" as const })) : undefined}
      />,
    );
  }

  test.each([false, true])("휴일과 소속 아님을 뺀 모든 종류의 칸에 같은 플래그가 보이고 칸은 그대로다(관리자=%s)", (admin) => {
    renderFlagged(admin);
    expect(flags().map((flag) => flag.getAttribute("aria-label"))).toEqual([
      "양ㅇㅇ 2026-10-30 면담",
      "홍ㅇㅇ 2026-10-27 면담",
      "홍ㅇㅇ 2026-10-28 면담",
      "홍ㅇㅇ 2026-10-29 면담",
    ]);
    expect(new Set(flags().map((flag) => flag.className)).size).toBe(1);
    // 근태 표기와 색은 그대로다.
    const trip = screen.getByRole("button", { name: /양ㅇㅇ 10\/30\(금\) 건강검진/ });
    expect(trip).toHaveTextContent(/^건$/);
    expect(trip.className).toContain("bg-att-checkup");
  });

  test("면담이 있어도 관리자 집계 항목은 달라지지 않는다", () => {
    const summaryText = (value: readonly { name: string; date: string }[]) => {
      const { container, unmount } = render(
        <AttendanceTable roster={roster} days={days} records={records} interviews={value} today="2026-10-29" showSummary />,
      );
      const text = [...container.querySelectorAll("tfoot")].map((foot) => foot.textContent).join("|");
      unmount();
      return text;
    };
    expect(summaryText(interviews)).toBe(summaryText([]));
  });

  test("범례에 면담 플래그 설명이 있다", () => {
    render(<AttendanceLegend />);
    expect(screen.getByText(/^면담/)).toBeInTheDocument();
  });
});
