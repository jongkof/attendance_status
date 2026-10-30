"use client";

import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { DayMark } from "@/lib/calendar";
import type { RemoteGroup, RosterBlock } from "@/lib/remote";
import type { Tenure } from "@/lib/roster";
import {
  copyImage,
  interviewCaptureTable,
  remoteCaptureTable,
  renderTableImage,
  saveImage,
  type CaptureTable,
} from "@/lib/table-capture";

type Notice = { tone: "ok" | "fail"; text: string } | null;

/**
 * 지금 보이는 달의 표를 이미지로 복사하거나 PNG로 저장하는 버튼 두 개.
 * 이미지를 만드는 동안은 눌린 상태로 두어 중복으로 누르지 못하게 한다.
 */
function CaptureButtons({ build, fileName }: { build: () => CaptureTable; fileName: string }) {
  const [busy, setBusy] = useState<"copy" | "save" | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function run(kind: "copy" | "save") {
    if (busy) return;
    setBusy(kind);
    setNotice(null);
    try {
      if (kind === "copy") {
        await copyImage(() => renderTableImage(build()));
        setNotice({ tone: "ok", text: "이미지를 복사했습니다. 메일 본문에 붙여 넣어 주세요." });
      } else {
        saveImage(await renderTableImage(build()), fileName);
        setNotice({ tone: "ok", text: `${fileName} 파일로 저장했습니다.` });
      }
    } catch {
      setNotice({
        tone: "fail",
        text:
          kind === "copy"
            ? "브라우저가 이미지 복사를 막았습니다. “이미지 저장”으로 파일을 저장해 메일에 첨부해 주세요."
            : "이미지를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" aria-busy={busy === "copy"} disabled={busy !== null} onClick={() => run("copy")}>
          {busy === "copy" ? "이미지 만드는 중…" : "이미지로 복사"}
        </Button>
        <Button type="button" size="sm" variant="outline" aria-busy={busy === "save"} disabled={busy !== null} onClick={() => run("save")}>
          {busy === "save" ? "이미지 만드는 중…" : "이미지 저장"}
        </Button>
      </div>
      {notice ? (
        <Alert variant={notice.tone === "fail" ? "destructive" : "default"}>
          {notice.tone === "fail" ? <CircleAlertIcon /> : null}
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

const monthKey = (days: readonly string[]) => days[0].slice(0, 7);

/** 리모트 관리 화면용. 표에 보이는 계획(미리 보기 포함)을 그대로 이미지로 만든다. */
export function RemoteCaptureButtons({
  groups,
  unassigned,
  days,
  dayMarks,
  isSkipWeek,
  isPlanned,
}: {
  groups: readonly RemoteGroup[];
  unassigned: readonly string[];
  days: readonly string[];
  dayMarks: Record<string, DayMark>;
  isSkipWeek: (week: string) => boolean;
  isPlanned: (groupId: number | null, name: string, date: string) => boolean;
}) {
  return (
    <CaptureButtons
      fileName={`리모트-${monthKey(days)}.png`}
      build={() => {
        // 화면 표와 같은 순서: 미배정, 그다음 팀원이 있는 조
        const blocks: RosterBlock[] = [];
        const groupIds: (number | null)[] = [];
        if (unassigned.length > 0) {
          blocks.push({ name: null, members: [...unassigned] });
          groupIds.push(null);
        }
        for (const group of groups) {
          if (group.members.length === 0) continue;
          blocks.push({ name: group.name, members: [...group.members] });
          groupIds.push(group.id);
        }
        return remoteCaptureTable({ blocks, groupIds, days, dayMarks, isSkipWeek, isPlanned });
      }}
    />
  );
}

/** 면담 관리 화면용. */
export function InterviewCaptureButtons({
  blocks,
  days,
  dayMarks,
  tenures,
  isInterview,
}: {
  blocks: readonly RosterBlock[];
  days: readonly string[];
  dayMarks: Record<string, DayMark>;
  tenures: Readonly<Record<string, Tenure>>;
  isInterview: (name: string, date: string) => boolean;
}) {
  return (
    <CaptureButtons
      fileName={`면담-${monthKey(days)}.png`}
      build={() => interviewCaptureTable({ blocks, days, dayMarks, tenures, isInterview })}
    />
  );
}
