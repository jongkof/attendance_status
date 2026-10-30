import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { InterviewManager } from "@/components/interview-manager";
import { weekdaysOfMonth } from "@/lib/attendance";

const days = weekdaysOfMonth(2026, 10);
const blocks = [
  { name: null, members: ["곽ㅇㅇ"] },
  { name: "1조", members: ["양ㅇㅇ", "홍ㅇㅇ"] },
];
const dayMarks = { "2026-10-09": { holiday: "한글날", events: [] } };
const tenures = { 홍ㅇㅇ: { start: "2026-10-15", removedOn: null } };

type Result = { ok: true } | { ok: false; error: string };

function renderManager(setCell: (name: string, date: string, on: boolean) => Promise<Result> = vi.fn(async () => ({ ok: true as const }))) {
  render(
    <InterviewManager
      blocks={blocks}
      days={days}
      today="2026-10-29"
      dayMarks={dayMarks}
      tenures={tenures}
      interviews={[{ name: "양ㅇㅇ", date: "2026-10-20" }]}
      setCell={setCell}
    />,
  );
  return setCell;
}

describe("면담 표", () => {
  test("켜진 칸은 눌린 상태로 보이고 누르면 끄는 요청이 간다", async () => {
    const setCell = renderManager();
    const cell = screen.getByRole("button", { name: "양ㅇㅇ 10/20 면담" });
    expect(cell).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(cell);
    await waitFor(() => expect(setCell).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-20", false));
  });

  test("꺼진 칸은 지난 날짜와 미래 날짜 모두 눌러서 켠다", async () => {
    const setCell = renderManager();
    fireEvent.click(screen.getByRole("button", { name: "곽ㅇㅇ 10/1 면담 없음" }));
    await waitFor(() => expect(setCell).toHaveBeenCalledWith("곽ㅇㅇ", "2026-10-01", true));
    // 저장 중에는 눌리지 않으므로 끝난 뒤에 다음 칸을 누른다.
    await waitFor(() => expect(screen.getByRole("button", { name: "곽ㅇㅇ 10/30 면담 없음" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "곽ㅇㅇ 10/30 면담 없음" }));
    await waitFor(() => expect(setCell).toHaveBeenCalledWith("곽ㅇㅇ", "2026-10-30", true));
  });

  test("휴일 칸과 소속 아님 칸은 버튼이 아니다", () => {
    renderManager();
    expect(screen.getByRole("img", { name: "곽ㅇㅇ 10/9 휴일" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /곽ㅇㅇ 10\/9 / })).toBeNull();
    expect(screen.getByRole("img", { name: "홍ㅇㅇ 10/14 소속 아님" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홍ㅇㅇ 10/15 면담 없음" })).toBeEnabled();
  });

  test("저장이 거절되면 이유를 보여 주고 칸은 원래대로 돌아온다", async () => {
    renderManager(vi.fn(async () => ({ ok: false as const, error: "로그인이 필요합니다." })));
    fireEvent.click(screen.getByRole("button", { name: "곽ㅇㅇ 10/1 면담 없음" }));
    expect(await screen.findByText("로그인이 필요합니다.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "곽ㅇㅇ 10/1 면담 없음" })).toHaveAttribute("aria-pressed", "false"),
    );
  });

  test("메모나 시간을 적는 입력이 없다", () => {
    renderManager();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("면담 표 연속 누르기", () => {
  test("저장이 끝나기 전에도 다른 칸을 누를 수 있다", async () => {
    let finish!: () => void;
    const setCell = vi
      .fn<(name: string, date: string, on: boolean) => Promise<Result>>()
      .mockImplementationOnce(() => new Promise((done) => (finish = () => done({ ok: true }))))
      .mockResolvedValue({ ok: true });
    renderManager(setCell);

    fireEvent.click(screen.getByRole("button", { name: "곽ㅇㅇ 10/1 면담 없음" }));
    const next = screen.getByRole("button", { name: "곽ㅇㅇ 10/2 면담 없음" });
    expect(next).toBeEnabled();
    fireEvent.click(next);
    await waitFor(() => expect(setCell).toHaveBeenCalledWith("곽ㅇㅇ", "2026-10-02", true));
    expect(screen.getByRole("button", { name: "곽ㅇㅇ 10/1 면담" })).toHaveAttribute("aria-pressed", "true");
    finish();
  });
});
