import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { PromptPanel } from "@/components/prompt-panel";

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

const preview = () => (screen.getByLabelText("프롬프트 미리보기") as HTMLTextAreaElement).value;

describe("Copilot 프롬프트 영역", () => {
  test("처음에는 오늘 하루로 채워지고 명단이 들어 있다", () => {
    render(<PromptPanel today="2026-10-26" names={["김ㅇㅇ", "이ㅇㅇ"]} />);
    expect(screen.getByLabelText("시작일")).toHaveValue("2026-10-26");
    expect(screen.getByLabelText("종료일")).toHaveValue("2026-10-26");
    expect(preview()).toContain('"rangeStart": "2026-10-26"');
    expect(preview()).toContain("김ㅇㅇ, 이ㅇㅇ");
  });

  test("날짜를 바꾸면 프롬프트가 따라 바뀐다", () => {
    render(<PromptPanel today="2026-10-26" names={["김ㅇㅇ"]} />);
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-10-28" } });
    expect(preview()).toContain('"rangeEnd": "2026-10-28"');
    expect(preview()).toContain("2026-10-26부터 2026-10-28까지");
  });

  test("종료일이 시작일보다 앞서면 이유를 보이고 복사를 막는다", () => {
    render(<PromptPanel today="2026-10-26" names={["김ㅇㅇ"]} />);
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-10-27" } });
    expect(screen.getByText("종료일은 시작일보다 앞설 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /복사/ })).toBeDisabled();
  });

  test("복사하면 프롬프트 전체가 클립보드에 들어가고 안내한다", async () => {
    render(<PromptPanel today="2026-10-26" names={["김ㅇㅇ"]} />);
    fireEvent.click(screen.getByRole("button", { name: /복사/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(preview()));
    expect(await screen.findByRole("status")).toHaveTextContent("프롬프트를 복사했습니다");
  });

  test("복사가 막히면 직접 복사하라고 안내한다", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<PromptPanel today="2026-10-26" names={["김ㅇㅇ"]} />);
    fireEvent.click(screen.getByRole("button", { name: /복사/ }));
    expect(await screen.findByRole("status")).toHaveTextContent("직접 선택해 복사");
  });
});
