import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

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
    expect(new Set(widths)).toEqual(new Set(["4rem"]));
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
    expect(within(trip).getByText("건강검진")).toBeInTheDocument();
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
