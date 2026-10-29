import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { MailPreview } from "@/components/mail-preview";

const subject = "[근태 현황] 10/26(월) · 부재 6 · 리모트 4";
const html = '<div><b>10/26(월) 근태 현황</b><div>부재 6명</div></div>';
const text = "10/26(월) 근태 현황\n부재 6명";

class FakeClipboardItem {
  constructor(public items: Record<string, Blob>) {}
}

const write = vi.fn();
const writeText = vi.fn();

beforeEach(() => {
  write.mockReset().mockResolvedValue(undefined);
  writeText.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
  Object.defineProperty(navigator, "clipboard", { value: { write, writeText }, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("현황 메일 미리보기와 복사", () => {
  test("제목과 본문 미리보기를 그대로 보여 준다", () => {
    render(<MailPreview subject={subject} html={html} text={text} />);
    expect(screen.getByTestId("mail-subject")).toHaveTextContent(subject);
    expect(screen.getByTestId("mail-body").innerHTML).toBe(html);
  });

  test("본문 복사는 서식이 있는 형태와 글자만 있는 형태를 함께 클립보드에 넣고 안내한다", async () => {
    render(<MailPreview subject={subject} html={html} text={text} />);
    fireEvent.click(screen.getByRole("button", { name: /본문 복사/ }));

    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    const [items] = write.mock.calls[0] as [FakeClipboardItem[]];
    expect(Object.keys(items[0].items).sort()).toEqual(["text/html", "text/plain"]);
    expect(await items[0].items["text/html"].text()).toBe(html);
    expect(await items[0].items["text/plain"].text()).toBe(text);
    expect(await screen.findByRole("status")).toHaveTextContent("본문을 복사했습니다");
  });

  test("제목 복사는 제목을 글자로 복사한다", async () => {
    render(<MailPreview subject={subject} html={html} text={text} />);
    fireEvent.click(screen.getByRole("button", { name: /제목 복사/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(subject));
    expect(await screen.findByRole("status")).toHaveTextContent("제목을 복사했습니다");
  });

  test("브라우저가 복사를 막으면 실패했다는 안내와 직접 복사 방법을 알려 준다", async () => {
    write.mockRejectedValueOnce(new Error("NotAllowedError"));
    render(<MailPreview subject={subject} html={html} text={text} />);
    fireEvent.click(screen.getByRole("button", { name: /본문 복사/ }));

    const notice = await screen.findByRole("status");
    await waitFor(() => expect(notice).toHaveTextContent("브라우저가 복사를 막았습니다"));
    expect(notice).toHaveTextContent("Ctrl+C");
    expect(notice).not.toHaveTextContent("복사했습니다");
  });

  test("클립보드 기능이 아예 없는 브라우저에서도 실패 안내가 나온다", async () => {
    vi.stubGlobal("ClipboardItem", undefined);
    render(<MailPreview subject={subject} html={html} text={text} />);
    fireEvent.click(screen.getByRole("button", { name: /본문 복사/ }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("브라우저가 복사를 막았습니다"));
  });
});
