"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildCopilotPrompt, checkPromptRange } from "@/lib/copilot-prompt";

type Notice = { tone: "ok" | "fail"; text: string } | null;

/** 날짜를 채운 Copilot 프롬프트를 보여 주고 한 번에 복사하게 한다. 명단은 서버가 읽어 넘긴다. */
export function PromptPanel({ today, names }: { today: string; names: readonly string[] }) {
  const [range, setRange] = useState({ start: today, end: today });
  const [notice, setNotice] = useState<Notice>(null);

  const checked = checkPromptRange(range);
  const prompt = checked.ok ? buildCopilotPrompt(range, names) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setNotice({ tone: "ok", text: "프롬프트를 복사했습니다. Copilot에 붙여 넣어 주세요." });
    } catch {
      setNotice({ tone: "fail", text: "브라우저가 복사를 막았습니다. 아래 미리보기를 직접 선택해 복사(Ctrl+C)해 주세요." });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Copilot 프롬프트</CardTitle>
        <CardDescription>
          정리할 메일의 수신 기간을 고르고 복사해 Copilot에 붙여 넣으세요. 월요일 아침이라면 시작일을 주말 앞으로 당기세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="flex flex-wrap gap-4">
            <Field className="w-44">
              <FieldLabel htmlFor="prompt-start">시작일</FieldLabel>
              <Input
                id="prompt-start"
                type="date"
                value={range.start}
                onChange={(event) => setRange({ ...range, start: event.target.value })}
              />
            </Field>
            <Field className="w-44" data-invalid={!checked.ok}>
              <FieldLabel htmlFor="prompt-end">종료일</FieldLabel>
              <Input
                id="prompt-end"
                type="date"
                value={range.end}
                aria-invalid={!checked.ok}
                onChange={(event) => setRange({ ...range, end: event.target.value })}
              />
            </Field>
          </div>
          {checked.ok ? null : <FieldError>{checked.error}</FieldError>}
          <Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!checked.ok} onClick={copy}>
                <CopyIcon data-icon="inline-start" />
                복사
              </Button>
              <p
                role="status"
                aria-live="polite"
                className={notice?.tone === "fail" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
              >
                {notice?.tone === "ok" ? <CheckIcon className="mr-1 inline size-4" aria-hidden /> : null}
                {notice?.text}
              </p>
            </div>
            <FieldLabel htmlFor="prompt-preview" className="sr-only">
              프롬프트 미리보기
            </FieldLabel>
            <Textarea
              id="prompt-preview"
              readOnly
              className="max-h-80 min-h-40 overflow-auto font-mono text-xs"
              value={prompt}
              placeholder="기간을 바로잡으면 프롬프트가 나타납니다."
            />
            <FieldDescription>팀 명단 {names.length}명이 들어 있습니다. 팀원을 고치면 다음에 열 때 반영됩니다.</FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
