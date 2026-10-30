import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { AttendanceTable } from "@/components/attendance-table";
import { CellEditProvider, EditModeBar, EditModeFrame, EditModeSwitch, type CellEditActions } from "@/components/cell-edit";
import type { AttendanceRecord } from "@/lib/attendance";

const days = ["2026-10-28", "2026-10-29", "2026-10-30"];
const roster = ["양ㅇㅇ", "홍ㅇㅇ", "김ㅇㅇ"];
const records: AttendanceRecord[] = [
  { name: "양ㅇㅇ", date: "2026-10-29", type: "휴가", period: null, time: null, note: "메모", receivedAt: "2026-10-26T09:00:00+09:00" },
];
const ok = async () => ({ ok: true as const });

function setup(overrides: Partial<CellEditActions> = {}) {
  const actions: CellEditActions = {
    edit: vi.fn(ok),
    setRemotePlan: vi.fn(ok),
    setInterview: vi.fn(ok),
    ...overrides,
  };
  const toggle = vi.fn(async () => ({ ok: true as const, marked: true }));
  const toggleMorning = vi.fn(async () => ({ ok: true as const, state: "present" as const }));
  render(
    <CellEditProvider actions={actions}>
      <EditModeSwitch />
      <EditModeBar />
      <EditModeFrame>
        <AttendanceTable
          roster={roster}
          days={days}
          records={records}
          planned={["홍ㅇㅇ|2026-10-29"]}
          added={["홍ㅇㅇ|2026-10-29"]}
          interviews={[{ name: "홍ㅇㅇ", date: "2026-10-29" }]}
          dayMarks={{ "2026-10-28": { holiday: "창립기념일", events: [] } }}
          tenures={{ 김ㅇㅇ: { start: "2026-10-30", removedOn: null } }}
          today="2026-10-30"
          toggle={toggle}
          toggleMorning={toggleMorning}
          edit
        />
      </EditModeFrame>
    </CellEditProvider>,
  );
  return { actions, toggle, toggleMorning };
}

const turnOn = () => fireEvent.click(screen.getByRole("switch", { name: "수정 모드" }));
// 수정 모드에서 안쪽 버튼은 inert라 브라우저에서는 접근성 트리에서 빠진다. jsdom은 그렇지 않아 칸 래퍼만 고른다.
const cell = (label: RegExp) => {
  const [wrapper] = screen.getAllByRole("button", { name: label }).filter((element) => element.hasAttribute("data-edit-cell"));
  return wrapper;
};
/** 칸을 눌러 팝업을 열고, 팝업 안에서만 찾는 도구를 돌려준다(칸 버튼의 이름과 겹치지 않게). */
async function openPopup(label: RegExp) {
  fireEvent.click(cell(label));
  return within(await screen.findByRole("dialog"));
}

describe("수정 모드", () => {
  test("끄면 기존 토글이 그대로 동작하고 수정 표시줄과 팝업은 없다", () => {
    const { toggle } = setup();
    expect(screen.queryByText(/수정 모드 켜짐/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /양ㅇㅇ 2026-10-30 출근, 눌러서 미확인/ }));
    expect(toggle).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-30");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("켜면 표시줄이 뜨고, 칸을 누르면 토글 없이 팝업이 뜬다", async () => {
    const { toggle, toggleMorning } = setup();
    turnOn();
    expect(screen.getByText(/수정 모드 켜짐/)).toBeInTheDocument();
    fireEvent.click(cell(/양ㅇㅇ 10\/30\(금\) 기록 없음\(출근\), 눌러서 수정/));
    const dialog = await screen.findByRole("dialog", { name: /양ㅇㅇ · 10\/30\(금\)/ });
    for (const title of ["근태 유형", "리모트 계획", "면담"]) {
      expect(within(dialog).getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(toggle).not.toHaveBeenCalled();
    expect(toggleMorning).not.toHaveBeenCalled();
  });

  test("휴일 칸과 소속 아님 칸은 팝업 없이 안내만 뜬다", async () => {
    setup();
    turnOn();
    fireEvent.click(cell(/양ㅇㅇ 10\/28\(수\).*휴일 칸은 수정할 수 없습니다/));
    expect(await screen.findByText("창립기념일 휴일 칸은 수정할 수 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(cell(/김ㅇㅇ 10\/29\(목\).*소속이 아니라/));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("수정 팝업", () => {
  test("휴가를 고르면 바로 저장되고 팝업이 닫히며 표시줄에 남는다", async () => {
    const { actions } = setup();
    turnOn();
    const popup = await openPopup(/홍ㅇㅇ 10\/30\(금\)/);
    fireEvent.click(popup.getByRole("button", { name: /휴가/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(actions.edit).toHaveBeenCalledWith("홍ㅇㅇ", "2026-10-30", { kind: "record", type: "휴가", period: null });
    expect(screen.getByText(/방금 바꿈: 홍ㅇㅇ 10\/30\(금\) → 휴가/)).toBeInTheDocument();
  });

  test("반차는 구분을 고르기 전에는 저장되지 않는다", async () => {
    const { actions } = setup();
    turnOn();
    const popup = await openPopup(/홍ㅇㅇ 10\/30\(금\)/);
    fireEvent.click(popup.getByRole("button", { name: /^반차/ }));
    expect(actions.edit).not.toHaveBeenCalled();
    expect(popup.getByText("구분을 고르면 저장됩니다")).toBeInTheDocument();
    fireEvent.click(popup.getByRole("button", { name: "오후" }));
    await waitFor(() =>
      expect(actions.edit).toHaveBeenCalledWith("홍ㅇㅇ", "2026-10-30", { kind: "record", type: "반차", period: "오후" }),
    );
  });

  test("반반차는 네 구간 중에서 고른다", async () => {
    setup();
    turnOn();
    const popup = await openPopup(/홍ㅇㅇ 10\/30\(금\)/);
    fireEvent.click(popup.getByRole("button", { name: /^반반차/ }));
    for (const period of ["오전1", "오전2", "오후1", "오후2"]) {
      expect(popup.getByRole("button", { name: period })).toBeInTheDocument();
    }
  });

  test("기록이 없는 칸은 지우기가 막히고, 기록이 있는 칸은 지울 수 있다", async () => {
    const { actions } = setup();
    turnOn();
    const empty = await openPopup(/홍ㅇㅇ 10\/30\(금\)/);
    expect(empty.getByRole("button", { name: /기록 지우기 \(지울 기록 없음\)/ })).toBeDisabled();
    fireEvent.click(empty.getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const filled = await openPopup(/양ㅇㅇ 10\/29\(목\) 휴가/);
    fireEvent.click(filled.getByRole("button", { name: /^기록 지우기$/ }));
    await waitFor(() => expect(actions.edit).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-29", { kind: "clear" }));
  });

  test("근태 유형 리모트(기록)와 리모트 계획은 다른 항목이고 서로 다른 요청을 보낸다", async () => {
    const { actions } = setup();
    turnOn();
    const popup = await openPopup(/홍ㅇㅇ 10\/29\(목\)/);
    expect(popup.getByText("리모트 계획: 있음(직접 추가)")).toBeInTheDocument();
    expect(popup.getByText("면담: 켜짐")).toBeInTheDocument();
    expect(popup.getByRole("button", { name: "리모트 (근태 기록)" })).toBeInTheDocument();
    fireEvent.click(popup.getByRole("button", { name: /리모트 계획 해제/ }));
    await waitFor(() => expect(actions.setRemotePlan).toHaveBeenCalledWith("홍ㅇㅇ", "2026-10-29", false));
    expect(actions.edit).not.toHaveBeenCalled();
  });

  test("리모트 계획이 없는 칸에는 추가가, 면담이 꺼진 칸에는 켜기가 보인다", async () => {
    const { actions } = setup();
    turnOn();
    const first = await openPopup(/양ㅇㅇ 10\/30\(금\)/);
    fireEvent.click(first.getByRole("button", { name: /리모트 계획 추가/ }));
    await waitFor(() => expect(actions.setRemotePlan).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-30", true));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const second = await openPopup(/양ㅇㅇ 10\/30\(금\)/);
    fireEvent.click(second.getByRole("button", { name: /면담 표시 켜기/ }));
    await waitFor(() => expect(actions.setInterview).toHaveBeenCalledWith("양ㅇㅇ", "2026-10-30", true));
  });

  test("저장이 거절되면 팝업에 이유가 보이고 열려 있다", async () => {
    setup({ edit: vi.fn(async () => ({ ok: false as const, error: "로그인이 필요합니다." })) });
    turnOn();
    const popup = await openPopup(/홍ㅇㅇ 10\/30\(금\)/);
    fireEvent.click(popup.getByRole("button", { name: /^교육/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("로그인이 필요합니다.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
