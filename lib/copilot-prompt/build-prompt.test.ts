import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { buildCopilotPrompt, checkPromptRange } from "./build-prompt";

const range = { start: "2026-10-26", end: "2026-10-27" };
const names = ["김ㅇㅇ", "이ㅇㅇ"];

describe("Copilot 프롬프트", () => {
  const prompt = buildCopilotPrompt(range, names);

  test("날짜와 rangeStart·rangeEnd가 채워지고 빈 자리표시자가 남지 않는다", () => {
    expect(prompt).toContain("2026-10-26부터 2026-10-27까지");
    expect(prompt).toContain('"rangeStart": "2026-10-26"');
    expect(prompt).toContain('"rangeEnd": "2026-10-27"');
    expect(prompt).not.toContain("{{");
  });

  test("팀 명단을 그대로 담는다", () => {
    expect(prompt).toContain("[팀 명단]\n김ㅇㅇ, 이ㅇㅇ\n");
  });

  test("코드블록 금지, 중복 제거 금지, 예시 혼입 금지 문구가 있다", () => {
    expect(prompt).toContain("마크다운 코드블록");
    expect(prompt).toContain("합치거나 지우지 말고");
    expect(prompt).toContain("예시 이름이나 내용을 결과에 넣지 않는다");
  });

  test("원문(prompt-template.md)의 본문과 같다", () => {
    const template = readFileSync("docs/specs/copilot-prompt/prompt-template.md", "utf8").replace(/\r\n/g, "\n").split("\n---\n")[1].trim();
    const filled = template
      .replaceAll("{{시작일}}", range.start)
      .replaceAll("{{종료일}}", range.end)
      .replace("{{명단}}", names.join(", "));
    expect(prompt.trim()).toBe(filled);
  });
});

describe("프롬프트 기간 검사", () => {
  test("같은 날과 뒤의 종료일은 통과한다", () => {
    expect(checkPromptRange({ start: "2026-10-26", end: "2026-10-26" }).ok).toBe(true);
    expect(checkPromptRange(range).ok).toBe(true);
  });

  test("종료일이 시작일보다 앞서면 이유와 함께 거절한다", () => {
    const result = checkPromptRange({ start: "2026-10-27", end: "2026-10-26" });
    expect(result).toEqual({ ok: false, error: "종료일은 시작일보다 앞설 수 없습니다." });
  });

  test("날짜가 비어 있으면 거절한다", () => {
    expect(checkPromptRange({ start: "", end: "2026-10-26" }).ok).toBe(false);
  });
});
