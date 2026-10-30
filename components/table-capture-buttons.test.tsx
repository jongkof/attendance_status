import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { InterviewCaptureButtons, RemoteCaptureButtons } from "@/components/table-capture-buttons";
import { weekdaysOfMonth } from "@/lib/attendance";

const days = weekdaysOfMonth(2026, 11);
const png = new Blob(["png"], { type: "image/png" });

vi.mock("@/lib/table-capture", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/table-capture")>()),
  renderTableImage: vi.fn(async () => png),
}));

const write = vi.fn();
class FakeClipboardItem {
  constructor(public items: Record<string, Promise<Blob>>) {}
}

function remoteButtons() {
  return render(
    <RemoteCaptureButtons
      groups={[{ id: 1, name: "1조", members: ["양ㅇㅇ"] }]}
      unassigned={[]}
      days={days}
      dayMarks={{}}
      isSkipWeek={() => false}
      isPlanned={() => true}
    />,
  );
}

beforeEach(() => {
  write.mockReset();
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
  Object.defineProperty(navigator, "clipboard", { value: { write }, configurable: true });
  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

describe("이미지 복사·저장 버튼", () => {
  test("복사하면 PNG를 클립보드에 넣고 안내가 나온다", async () => {
    write.mockResolvedValue(undefined);
    remoteButtons();
    fireEvent.click(screen.getByRole("button", { name: "이미지로 복사" }));
    await screen.findByText("이미지를 복사했습니다. 메일 본문에 붙여 넣어 주세요.");
    const item = write.mock.calls[0][0][0] as FakeClipboardItem;
    expect(Object.keys(item.items)).toEqual(["image/png"]);
    expect(await item.items["image/png"]).toBe(png);
  });

  test("만드는 동안 두 버튼이 눌린 상태로 잠겨 중복으로 누르지 못한다", async () => {
    let finish: () => void = () => {};
    write.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    remoteButtons();
    fireEvent.click(screen.getByRole("button", { name: "이미지로 복사" }));
    const busy = await screen.findByRole("button", { name: "이미지 만드는 중…" , busy: true });
    expect(busy).toBeDisabled();
    expect(screen.getByRole("button", { name: "이미지 저장" })).toBeDisabled();
    fireEvent.click(busy);
    expect(write).toHaveBeenCalledTimes(1);
    finish();
    await screen.findByText(/복사했습니다/);
    expect(screen.getByRole("button", { name: "이미지로 복사" })).toBeEnabled();
  });

  test("복사가 막히면 복사하지 못했다고 알리고 저장을 안내하며, 저장은 여전히 동작한다", async () => {
    write.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    remoteButtons();
    fireEvent.click(screen.getByRole("button", { name: "이미지로 복사" }));
    await screen.findByText(/브라우저가 이미지 복사를 막았습니다.*이미지 저장/);

    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
    await screen.findByText("리모트-2026-11.png 파일로 저장했습니다.");
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  test("ClipboardItem이 없는 브라우저에서도 같은 실패 안내가 나온다", async () => {
    vi.stubGlobal("ClipboardItem", undefined);
    remoteButtons();
    fireEvent.click(screen.getByRole("button", { name: "이미지로 복사" }));
    await screen.findByText(/브라우저가 이미지 복사를 막았습니다/);
  });

  test("저장은 내려받기 링크의 파일 이름에 달을 담는다", async () => {
    const names: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    render(
      <InterviewCaptureButtons blocks={[{ name: null, members: ["양ㅇㅇ"] }]} days={days} dayMarks={{}} tenures={{}} isInterview={() => false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
    await waitFor(() => expect(names).toEqual(["면담-2026-11.png"]));
    click.mockRestore();
  });
});
