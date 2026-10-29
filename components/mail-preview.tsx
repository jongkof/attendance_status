"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Notice = { tone: "ok" | "fail"; text: string } | null;

/** 서식이 있는 본문과 글자만 있는 본문을 함께 클립보드에 넣는다. Outlook은 서식이 있는 쪽을 쓴다. */
async function copyRich(html: string, text: string) {
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" }),
    }),
  ]);
}

export function MailPreview({ subject, html, text }: { subject: string; html: string; text: string }) {
  const [notice, setNotice] = useState<Notice>(null);

  async function run(job: () => Promise<void>, done: string) {
    try {
      await job();
      setNotice({ tone: "ok", text: done });
    } catch {
      setNotice({
        tone: "fail",
        text: "브라우저가 복사를 막았습니다. 아래 미리보기를 직접 선택해 복사(Ctrl+C)해 주세요.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>제목</CardTitle>
          <CardDescription>메일 제목에 붙여 넣습니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="font-medium" data-testid="mail-subject">
            {subject}
          </p>
          <Button variant="outline" size="sm" onClick={() => run(() => navigator.clipboard.writeText(subject), "제목을 복사했습니다.")}>
            <CopyIcon data-icon="inline-start" />
            제목 복사
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>본문 미리보기</CardTitle>
          <CardDescription>이 모양 그대로 복사됩니다. Outlook 본문에 붙여 넣으면 같은 서식으로 나옵니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => run(() => copyRich(html, text), "본문을 복사했습니다. 메일에 붙여 넣어 주세요.")}>
              <CopyIcon data-icon="inline-start" />
              본문 복사
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
          {/* html은 서버에서 모든 글자를 이스케이프해 만든 본문이다. 미리보기와 복사가 같은 값을 쓴다. */}
          <div
            data-testid="mail-body"
            className="overflow-x-auto rounded-md border bg-white p-4 text-black"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
