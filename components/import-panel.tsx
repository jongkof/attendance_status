"use client";

import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  describeRecord,
  shortDate,
  type ApplyResult,
  type AttendanceChange,
  type ChangeStatus,
  type ImportPlan,
} from "@/lib/attendance";

type Props = {
  preview: (text: string) => Promise<ImportPlan>;
  apply: (text: string) => Promise<ApplyResult>;
};

const STATUS_LABEL: Record<ChangeStatus, string> = {
  new: "새로 생김",
  changed: "바뀜",
  skipped: "건너뜀",
  unchanged: "변화 없음",
};

const STATUS_ORDER: ChangeStatus[] = ["changed", "skipped", "new", "unchanged"];

function count(changes: readonly AttendanceChange[], status: ChangeStatus) {
  return changes.filter((change) => change.status === status).length;
}

export function ImportPanel({ preview, apply }: Props) {
  const [text, setText] = useState("");
  const [previewed, setPreviewed] = useState<{ text: string; plan: ImportPlan } | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [pending, startTransition] = useTransition();

  const plan = previewed?.plan ?? null;
  const readyToApply =
    previewed !== null &&
    previewed.text === text &&
    plan?.ok === true &&
    plan.changes.some((change) => change.status === "new" || change.status === "changed");

  function runPreview() {
    setResult(null);
    startTransition(async () => {
      setPreviewed({ text, plan: await preview(text) });
    });
  }

  function runApply() {
    startTransition(async () => {
      const applied = await apply(text);
      setResult(applied);
      if (applied.ok) setPreviewed(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>근태 JSON 붙여 넣기</CardTitle>
          <CardDescription>
            Copilot이 출력한 JSON 전체를 그대로 붙여 넣으세요. 미리보기를 확인하기 전에는 아무것도 저장되지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="attendance-json">근태 JSON</FieldLabel>
              <Textarea
                id="attendance-json"
                className="min-h-48 font-mono text-xs"
                placeholder='{"generatedAt": "...", "records": [ ... ]}'
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
              />
              <FieldDescription>같은 사람·같은 날짜는 메일 수신 시각이 가장 늦은 공지가 유효합니다.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button variant={readyToApply ? "outline" : "default"} disabled={pending || text.trim() === ""} onClick={runPreview}>
            {pending && !readyToApply ? <Spinner data-icon="inline-start" /> : null}
            미리보기
          </Button>
          {readyToApply ? (
            <Button disabled={pending} onClick={runApply}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              반영하기
            </Button>
          ) : null}
        </CardFooter>
      </Card>

      {result?.ok === false ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>반영하지 못했습니다</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}

      {result?.ok === true ? (
        <Alert>
          <CircleCheckIcon />
          <AlertTitle>반영했습니다</AlertTitle>
          <AlertDescription>
            <p>
              새로 생긴 칸 {result.created}개, 바뀐 칸 {result.changed}개, 건너뛴 칸 {result.skipped}개, 변화 없는 칸{" "}
              {result.unchanged}개입니다.
            </p>
            <Link
              href={result.firstDate ? `/?month=${result.firstDate.slice(0, 7)}` : "/"}
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 w-fit" })}
            >
              현황 화면 보기
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {plan?.ok === false ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>JSON을 확인해 주세요</AlertTitle>
          <AlertDescription>{plan.error}</AlertDescription>
        </Alert>
      ) : null}

      {plan?.ok === true ? <PreviewResult plan={plan} stale={previewed?.text !== text} /> : null}
    </div>
  );
}

function PreviewResult({ plan, stale }: { plan: Extract<ImportPlan, { ok: true }>; stale: boolean }) {
  const { changes, issues } = plan;
  const flagged = changes.filter((change) => change.needsCheck);
  const rows = changes
    .filter((change) => change.status !== "unchanged")
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        a.next.name.localeCompare(b.next.name, "ko") ||
        a.next.date.localeCompare(b.next.date),
    );
  const nothingToApply = count(changes, "new") + count(changes, "changed") === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>미리보기</CardTitle>
        <CardDescription>
          {stale
            ? "붙여 넣은 내용이 바뀌었습니다. 다시 미리보기를 눌러 확인해 주세요."
            : nothingToApply
              ? "바뀌는 칸이 없습니다."
              : "아래 내용으로 반영됩니다. 확인한 뒤 반영하기를 눌러 주세요."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" aria-label="미리보기 요약">
          <Badge variant="default">새로 생김 {count(changes, "new")}</Badge>
          <Badge variant="secondary">바뀜 {count(changes, "changed")}</Badge>
          <Badge variant="outline">건너뜀 {count(changes, "skipped")}</Badge>
          <Badge variant="outline">변화 없음 {count(changes, "unchanged")}</Badge>
          <Badge variant="outline">확인 필요 {flagged.length}</Badge>
          <Badge variant={issues.length > 0 ? "destructive" : "outline"}>반영 제외 {issues.length}</Badge>
        </div>

        {issues.length > 0 ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>반영되지 않는 레코드 {issues.length}건</AlertTitle>
            <AlertDescription>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {issues.map((issue) => (
                  <li key={issue.index}>
                    {issue.index + 1}번째 레코드{issue.name ? ` (${issue.name})` : ""}:{" "}
                    {issue.kind === "unknown-name" ? "명단에 없는 이름입니다. " : ""}
                    {issue.kind === "invalid" ? issue.reason : "팀원 명단에 등록된 이름인지 확인해 주세요."}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {flagged.length > 0 ? (
          <Alert>
            <TriangleAlertIcon />
            <AlertTitle>확인 필요 {flagged.length}건</AlertTitle>
            <AlertDescription>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {flagged.map((change) => (
                  <li key={`${change.next.name}|${change.next.date}`}>
                    {change.next.name} {shortDate(change.next.date)} {describeRecord(change.next)}: {change.next.note}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {rows.length > 0 ? (
          <div className="max-h-[28rem] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>구분</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead>비고</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((change) => (
                  <TableRow key={`${change.next.name}|${change.next.date}`}>
                    <TableCell>
                      <Badge variant={change.status === "new" ? "default" : change.status === "changed" ? "secondary" : "outline"}>
                        {change.status === "skipped" ? "더 최근 기록이 있어 건너뜀" : STATUS_LABEL[change.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{change.next.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{shortDate(change.next.date)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {change.previous && change.status === "changed" ? (
                        <>
                          {describeRecord(change.previous)} → {describeRecord(change.next)}
                        </>
                      ) : change.previous && change.status === "skipped" ? (
                        <>유지: {describeRecord(change.previous)} (무시: {describeRecord(change.next)})</>
                      ) : (
                        describeRecord(change.next)
                      )}
                    </TableCell>
                    <TableCell className="min-w-48 whitespace-normal text-muted-foreground">{change.next.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
