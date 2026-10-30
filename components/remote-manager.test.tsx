import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { RemoteManager } from "@/components/remote-manager";
import { weekdaysOfMonth, type AttendanceRecord } from "@/lib/attendance";
import type { CalendarEntry } from "@/lib/calendar";
import type { RemoteRule, RemoteSetup } from "@/lib/remote";

const days = weekdaysOfMonth(2026, 10);
const entries: CalendarEntry[] = [
  { id: 1, date: "2026-10-05", kind: "holiday", name: "개천절 대체공휴일" },
  { id: 2, date: "2026-10-09", kind: "holiday", name: "한글날" },
];
const records: AttendanceRecord[] = [
  { name: "양ㅇㅇ", date: "2026-10-14", type: "휴가", period: null, time: null, note: null, receivedAt: "2026-10-12T09:00:00+09:00" },
];
const rule: RemoteRule = { from: "2026-09-28", order: ["월", "화", "수", "목", "금"], starts: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 } };

function setup(overrides: Partial<RemoteSetup> = {}): RemoteSetup {
  return {
    groups: [
      { id: 1, name: "1조", members: ["양ㅇㅇ"] },
      { id: 2, name: "2조", members: ["홍ㅇㅇ"] },
      { id: 3, name: "3조", members: ["이ㅇㅇ"] },
      { id: 4, name: "4조", members: ["김ㅇㅇ"] },
      { id: 5, name: "5조", members: ["박ㅇㅇ"] },
    ],
    unassigned: ["곽ㅇㅇ"],
    rules: [rule],
    ...overrides,
  };
}

function makeActions() {
  const ok = async (): Promise<{ ok: true } | { ok: false; error: string }> => ({ ok: true });
  return {
    addGroup: vi.fn(ok),
    renameGroup: vi.fn(ok),
    deleteGroup: vi.fn(ok),
    assignMember: vi.fn(ok),
    applyRule: vi.fn(ok),
    setCell: vi.fn(ok),
    setSkipWeek: vi.fn(ok),
  };
}

function renderManager(overrides: Partial<RemoteSetup> = {}, actions = makeActions()) {
  const view = render(
    <RemoteManager setup={setup(overrides)} entries={entries} records={records} days={days} today="2026-10-29" actions={actions} />,
  );
  return { ...view, actions };
}

const cell = (name: string) => screen.getByLabelText(name);

describe("리모트 표", () => {
  test("순환 결과: 휴일 주는 리모트가 없고, 10/12 주는 조1이 화요일로 이어진다", () => {
    renderManager();
    expect(cell("양ㅇㅇ 10/13 리모트")).toBeInTheDocument();
    expect(cell("양ㅇㅇ 10/12 리모트 아님")).toBeInTheDocument();
    expect(cell("박ㅇㅇ 10/12 리모트")).toBeInTheDocument();
    expect(cell("양ㅇㅇ 10/6 리모트 없는 주")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "10/5 주 리모트 없음" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "10/12 주 리모트 없음" })).not.toBeChecked();
  });

  test("휴일은 음영, 다른 근태 기록이 있는 칸은 그 근태의 색과 한 글자로 보인다", () => {
    renderManager();
    expect(cell("양ㅇㅇ 10/9 휴일").className).toContain("bg-muted");
    const leave = cell("양ㅇㅇ 10/14 휴가");
    expect(leave.className).toContain("bg-att-leave");
    expect(leave).toHaveTextContent("휴");
  });

  test("미배정 팀원이 맨 위에 라벨 없이 나온다", () => {
    const { container } = renderManager();
    const firstRow = container.querySelector("tbody tr")!;
    expect(firstRow.querySelector("th[scope=row]")).toHaveTextContent("곽ㅇㅇ");
    expect(firstRow.querySelector("th[scope=rowgroup]")?.textContent).toBe("");
  });
});

describe("직접 수정과 주 체크", () => {
  test("리모트 아닌 칸을 누르면 지정을, 리모트 칸을 누르면 해제를 서버에 보낸다", async () => {
    const { actions } = renderManager();
    fireEvent.click(cell("양ㅇㅇ 10/15 리모트 아님"));
    await waitFor(() => expect(actions.setCell).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-15", true));
    await waitFor(() => expect(cell("양ㅇㅇ 10/13 리모트")).toBeEnabled());
    fireEvent.click(cell("양ㅇㅇ 10/13 리모트"));
    await waitFor(() => expect(actions.setCell).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-13", false));
  });

  test("직접 지정한 칸은 리모트로 보이고 점 표시(직접 수정)가 붙는다. 한 주에 두 번도 된다", () => {
    renderManager({ edits: [{ name: "양ㅇㅇ", date: "2026-10-15", kind: "add" }, { name: "홍ㅇㅇ", date: "2026-10-14", kind: "remove" }] });
    expect(cell("양ㅇㅇ 10/13 리모트")).toBeInTheDocument();
    expect(cell("양ㅇㅇ 10/15 리모트 (직접 수정)")).toBeInTheDocument();
    expect(cell("홍ㅇㅇ 10/14 리모트 아님 (직접 수정)")).toBeInTheDocument();
    expect(cell("양ㅇㅇ 10/13 리모트").querySelector("span")).toBeNull();
    expect(cell("양ㅇㅇ 10/15 리모트 (직접 수정)").querySelector("span")).not.toBeNull();
  });

  test("미배정 팀원의 칸도 눌러 지정할 수 있다", async () => {
    const { actions } = renderManager();
    fireEvent.click(cell("곽ㅇㅇ 10/15 리모트 아님"));
    await waitFor(() => expect(actions.setCell).toHaveBeenCalledWith("곽ㅇㅇ", "2026-10-15", true));
  });

  test("휴일 칸과 다른 기록이 있는 칸은 눌리지 않는다", () => {
    renderManager();
    expect(cell("양ㅇㅇ 10/9 휴일").tagName).not.toBe("BUTTON");
    expect(cell("양ㅇㅇ 10/14 휴가").tagName).not.toBe("BUTTON");
  });

  test("주 체크를 켜면 바로 서버에 보내고, 휴일 주는 체크된 채 보이며 풀 수 있다", async () => {
    const { actions } = renderManager();
    const holidayWeek = screen.getByRole("checkbox", { name: "10/5 주 리모트 없음" });
    expect(holidayWeek).toBeChecked();
    expect(holidayWeek).toBeEnabled();
    fireEvent.click(holidayWeek);
    await waitFor(() => expect(actions.setSkipWeek).toHaveBeenCalledWith("2026-10-05", false));
    fireEvent.click(screen.getByRole("checkbox", { name: "10/12 주 리모트 없음" }));
    await waitFor(() => expect(actions.setSkipWeek).toHaveBeenCalledWith("2026-10-12", true));
  });

  test("푼 휴일 주는 리모트가 계획되고, 체크한 주는 리모트가 없다", () => {
    renderManager({ skipWeeks: { "2026-10-05": false, "2026-10-12": true } });
    expect(screen.getByRole("checkbox", { name: "10/5 주 리모트 없음" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "10/12 주 리모트 없음" })).toBeChecked();
    expect(cell("양ㅇㅇ 10/13 리모트 없는 주")).toBeInTheDocument();
    // 푼 10/5 주는 10/5·10/9 휴일 외의 요일에 조의 리모트가 계획된다(조1은 기준 주 다음 주 월요일이 휴일이라 다른 조가 보인다).
    expect(screen.getAllByLabelText(/10\/[678] 리모트$/).length).toBeGreaterThan(0);
  });
});

describe("조 편성", () => {
  test("팀원을 선택하고 조 버튼을 누르면 그 조로 옮긴다", async () => {
    const { actions } = renderManager();
    fireEvent.click(screen.getByRole("button", { name: "곽ㅇㅇ" }));
    const group = screen.getByRole("region", { name: "3조" });
    fireEvent.click(within(group).getByRole("button", { name: /여기로 옮기기/ }));
    await waitFor(() => expect(actions.assignMember).toHaveBeenCalledWith("곽ㅇㅇ", 3));
  });

  test("조 삭제는 서버 요청을 보낸다", async () => {
    const { actions } = renderManager();
    fireEvent.click(screen.getByRole("button", { name: "2조 삭제" }));
    await waitFor(() => expect(actions.deleteGroup).toHaveBeenCalledWith(2));
  });

  test("조 추가는 서버 요청을 보낸다", async () => {
    const { actions } = renderManager();
    fireEvent.click(screen.getByRole("button", { name: /조 추가/ }));
    await waitFor(() => expect(actions.addGroup).toHaveBeenCalled());
  });

  test("조 이름은 바로 고친다", async () => {
    const { actions } = renderManager();
    const [name] = screen.getAllByLabelText("조 이름");
    fireEvent.change(name, { target: { value: "A조" } });
    fireEvent.blur(name);
    await waitFor(() => expect(actions.renameGroup).toHaveBeenCalledWith(1, "A조"));
  });
});

describe("규칙 적용 흐름", () => {
  test("시작 요일을 바꾸면 표에 미리 반영되고 저장은 하지 않으며, 되돌리기로 취소한다", () => {
    const { actions } = renderManager();
    expect(screen.queryByRole("button", { name: "적용…" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("1조 시작 요일"), { target: { value: "2" } });
    expect(screen.getByText(/변경을 미리 보는 중/)).toBeInTheDocument();
    // 조1이 기준 주(9/28)에 수요일이면 10/12 주(휴일 주를 건너뛴 한 칸 뒤)는 목요일
    expect(cell("양ㅇㅇ 10/15 리모트")).toBeInTheDocument();
    expect(actions.applyRule).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(screen.queryByText(/변경을 미리 보는 중/)).not.toBeInTheDocument();
    expect(cell("양ㅇㅇ 10/13 리모트")).toBeInTheDocument();
  });

  test("적용을 누르면 주의 메시지가 뜨고, 확인해야 서버에 보낸다", async () => {
    const { actions } = renderManager();
    fireEvent.change(screen.getByLabelText("1조 시작 요일"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "적용…" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("기준 주 이전은 이전 패턴을 유지합니다");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("직접 고친 칸과 근태 기록은 그대로 남습니다");
    expect(actions.applyRule).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "확인하고 적용" }));
    await waitFor(() => expect(actions.applyRule).toHaveBeenCalledTimes(1));
    expect(actions.applyRule).toHaveBeenCalledWith({
      from: "2026-09-28",
      order: ["월", "화", "수", "목", "금"],
      starts: { 1: 2, 2: 1, 3: 2, 4: 3, 5: 4 },
    });
  });

  test("기준 주를 바꾸면 고른 날이 속한 주의 월요일로 적용된다", async () => {
    const { actions } = renderManager();
    fireEvent.change(screen.getByLabelText("기준 주"), { target: { value: "2026-10-21" } });
    expect(screen.getByText(/10\/19 주\)가 기준 주/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "적용…" }));
    fireEvent.click(screen.getByRole("button", { name: "확인하고 적용" }));
    await waitFor(() => expect(actions.applyRule).toHaveBeenCalledWith(expect.objectContaining({ from: "2026-10-19" })));
  });

  test("조 수가 단계 수보다 많으면 오류가 나오고 적용이 막힌다", () => {
    renderManager();
    fireEvent.click(screen.getByRole("button", { name: "금 삭제" }));
    expect(screen.getByRole("alert")).toHaveTextContent("조가 5개인데 요일 단계는 4개라 저장할 수 없습니다");
    expect(screen.getByRole("button", { name: "적용…" })).toBeDisabled();
  });

  test("단계를 모두 지우면 단계가 없다는 오류가 나온다", () => {
    renderManager();
    for (const step of ["월", "화", "수", "목", "금"]) fireEvent.click(screen.getByRole("button", { name: `${step} 삭제` }));
    expect(screen.getByRole("alert")).toHaveTextContent("요일 단계가 없어 저장할 수 없습니다");
    expect(screen.getByRole("button", { name: "적용…" })).toBeDisabled();
  });

  test("적용된 규칙이 없을 때는 안내가 나오고 기본 순서로 미리 볼 수 있다", () => {
    renderManager({ rules: [] });
    expect(screen.getByText(/아직 적용된 규칙이 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "적용…" })).toBeEnabled();
  });
});

describe("칸 누르기 반응", () => {
  const deferred = () => {
    let resolve!: (value: { ok: true } | { ok: false; error: string }) => void;
    const promise = new Promise<{ ok: true } | { ok: false; error: string }>((done) => (resolve = done));
    return { promise, resolve };
  };

  test("서버 응답 전에 칸이 바뀌고, 저장 중에도 다른 칸을 이어서 누를 수 있다", async () => {
    const first = deferred();
    const actions = makeActions();
    actions.setCell.mockImplementationOnce(() => first.promise);
    renderManager({}, actions);

    fireEvent.click(cell("양ㅇㅇ 10/15 리모트 아님"));
    await waitFor(() => expect(cell("양ㅇㅇ 10/15 리모트")).toBeInTheDocument());
    expect(cell("양ㅇㅇ 10/13 리모트")).toBeEnabled();
    fireEvent.click(cell("양ㅇㅇ 10/13 리모트"));
    await waitFor(() => expect(actions.setCell).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-13", false));
    expect(cell("양ㅇㅇ 10/13 리모트 아님")).toBeInTheDocument();
    first.resolve({ ok: true });
  });

  test("저장이 거절되면 이유가 나오고 칸이 원래대로 돌아온다", async () => {
    const actions = makeActions();
    actions.setCell.mockResolvedValueOnce({ ok: false, error: "로그인이 필요합니다." });
    renderManager({}, actions);

    fireEvent.click(cell("양ㅇㅇ 10/15 리모트 아님"));
    expect(await screen.findByText("로그인이 필요합니다.")).toBeInTheDocument();
    await waitFor(() => expect(cell("양ㅇㅇ 10/15 리모트 아님")).toHaveAttribute("aria-pressed", "false"));
  });
});
