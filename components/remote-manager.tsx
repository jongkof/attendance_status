"use client";

import { CircleAlertIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { RemoteGroupsEditor } from "@/components/remote-groups-editor";
import { RemoteRuleEditor, type RuleDraft } from "@/components/remote-rule-editor";
import { RemoteTable } from "@/components/remote-table";
import { RemoteCaptureButtons } from "@/components/table-capture-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceRecord } from "@/lib/attendance";
import { dayMarksFor, ruleHolidays, type CalendarEntry } from "@/lib/calendar";
import {
  checkRuleShape,
  createRemotePlan,
  mondayOf,
  WEEKDAY_STEPS,
  type RemoteRule,
  type RemoteSetup,
} from "@/lib/remote";

type Result = { ok: true } | { ok: false; error: string };

type Props = {
  setup: RemoteSetup;
  /** 저장된 달력 항목 전체(휴일·행사). 규칙 휴일은 여기서 계산한다. */
  entries: readonly CalendarEntry[];
  /** 표에 보이는 달의 근태 기록 */
  records: readonly AttendanceRecord[];
  days: readonly string[];
  today: string;
  actions: {
    addGroup: () => Promise<Result>;
    renameGroup: (id: number, name: string) => Promise<Result>;
    deleteGroup: (id: number) => Promise<Result>;
    assignMember: (name: string, groupId: number | null) => Promise<Result>;
    applyRule: (rule: RemoteRule) => Promise<Result>;
    setCell: (name: string, date: string, remote: boolean) => Promise<Result>;
    setSkipWeek: (week: string, skip: boolean) => Promise<Result>;
  };
};

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

export function RemoteManager({ setup, entries, records, days, today, actions }: Props) {
  const { groups, unassigned, rules } = setup;
  const savedRule = rules[rules.length - 1] ?? null;
  const initialDraft: RuleDraft = savedRule
    ? { from: savedRule.from, order: [...savedRule.order], starts: { ...savedRule.starts } }
    : { from: mondayOf(today), order: [...WEEKDAY_STEPS], starts: {} };

  // null이면 저장된 규칙을 그대로 보여 준다. 값을 바꾸면 초안이 생기고, "되돌리기"나 적용 뒤에는 다시 null이 된다.
  const [draftState, setDraftState] = useState<RuleDraft | null>(null);
  const draft = draftState ?? initialDraft;
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filledGroups = groups.filter((group) => group.members.length > 0);
  const stepCount = draft.order.length;
  const startOf = (groupId: number) => {
    if (stepCount === 0) return 0;
    const fallback = filledGroups.findIndex((group) => group.id === groupId);
    return (draft.starts[String(groupId)] ?? Math.max(fallback, 0)) % stepCount;
  };
  const effectiveRule: RemoteRule = {
    from: mondayOf(draft.from),
    order: draft.order,
    starts: Object.fromEntries(filledGroups.map((group) => [String(group.id), startOf(group.id)])),
  };

  const dirty =
    savedRule === null ||
    savedRule.from !== effectiveRule.from ||
    savedRule.order.join(",") !== effectiveRule.order.join(",") ||
    filledGroups.some((group) => (savedRule.starts[String(group.id)] ?? 0) !== effectiveRule.starts[String(group.id)]);
  const shape = checkRuleShape(stepCount, filledGroups.length);
  const blockedReason = !shape.ok ? shape.error : filledGroups.length === 0 ? "팀원이 있는 조가 없어 적용할 수 없습니다." : null;

  // 미리 보기: 적용하기 전에도 초안을 기준 주부터 덮어쓴 모양으로 표에 보여 준다.
  const previewRules = dirty && shape.ok ? [...rules.filter((rule) => rule.from < effectiveRule.from), effectiveRule] : rules;

  const plan = (() => {
    const years = new Set<number>();
    for (const date of [...days, ...previewRules.map((rule) => rule.from)]) years.add(Number(date.slice(0, 4)));
    const low = Math.min(...years);
    const high = Math.max(...years);
    const marked = new Set(entries.map((entry) => entry.date));
    const holidays = new Set(entries.filter((entry) => entry.kind === "holiday").map((entry) => entry.date));
    for (let year = low; year <= high; year++) {
      for (const rule of ruleHolidays(year)) {
        marked.add(rule.date);
        holidays.add(rule.date);
      }
    }
    return createRemotePlan({ ...setup, rules: previewRules }, { marked, holidays });
  })();
  const dayMarks = dayMarksFor(days, entries);

  function run(action: () => Promise<Result>, onOk?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setError(null);
        onOk?.();
      } else {
        setError(result.error);
      }
    });
  }

  const changeDraft = (next: RuleDraft) => {
    setDraftState(next);
    setConfirming(false);
    setNotice(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>조 편성</CardTitle>
          <CardDescription>
            팀원을 누르면 선택되고, 옮길 조의 버튼을 누르면 그 조로 들어갑니다. 조 이름은 바로 고칠 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RemoteGroupsEditor
            groups={groups}
            unassigned={unassigned}
            selected={selected}
            pending={pending}
            onSelect={setSelected}
            onMove={(groupId) => selected && run(() => actions.assignMember(selected, groupId), () => setSelected(null))}
            onRename={(id, name) => run(() => actions.renameGroup(id, name))}
            onAdd={() => run(actions.addGroup)}
            onDelete={(id) => run(() => actions.deleteGroup(id))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>순환 규칙</CardTitle>
          <CardDescription>
            요일 순서, 기준 주, 조별 시작 요일을 정합니다. 적용하면 기준 주 이후만 바뀌고 그 이전 주는 기존 규칙을 유지합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <RemoteRuleEditor
            draft={draft}
            baseWeekLabel={md(effectiveRule.from)}
            filledGroups={filledGroups}
            startOf={startOf}
            onChange={changeDraft}
          />
          {blockedReason ? (
            <p role="alert" className="text-sm text-destructive">
              {blockedReason}
            </p>
          ) : null}
          {dirty ? (
            <div className="flex flex-col gap-2 rounded-md border bg-accent/50 p-3 text-sm">
              <p>
                <b>{savedRule ? "변경을 미리 보는 중입니다." : "아직 적용된 규칙이 없습니다."}</b> 아래 리모트 표에 반영해 보여 주며,
                아직 저장되지 않았습니다.
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={blockedReason !== null || pending} onClick={() => setConfirming(true)}>
                  적용…
                </Button>
                {savedRule ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDraftState(null);
                      setConfirming(false);
                    }}
                  >
                    되돌리기
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          {confirming && dirty && blockedReason === null ? (
            <div role="alertdialog" aria-label="규칙 적용 확인" className="flex flex-col gap-2 rounded-md border border-destructive p-3 text-sm">
              <p>
                <b className="text-destructive">주의</b> · {md(effectiveRule.from)} 주부터의 패턴만 바뀌고 기준 주 이전은 이전 패턴을
                유지합니다. 이전 패턴이 없으면 이전 주도 새 패턴으로 계산됩니다. 직접 고친 칸과 근태 기록은 그대로 남습니다.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => actions.applyRule(effectiveRule),
                      () => {
                        setDraftState(null);
                        setConfirming(false);
                        setNotice(`${md(effectiveRule.from)} 주부터 새 규칙을 적용했습니다.`);
                      },
                    )
                  }
                >
                  확인하고 적용
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>리모트 표</CardTitle>
          <CardDescription>
            노란 칸은 리모트이고, 칸을 누르면 그 사람·날짜의 리모트를 넣거나 뺍니다(점은 직접 고친 칸). 주별 “리모트 없음”을 체크하면 그 주는 순환을 소모하지 않고
            건너뜁니다. 휴일이나 행사가 있는 주는 처음부터 체크되어 있으며, 풀면 리모트가 다시 계획됩니다. 이 변경은 “적용” 없이 바로 저장됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul aria-label="범례" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm bg-att-remote" />
              리모트
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm border border-input bg-background" />
              리모트 아님
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-sm bg-muted" />
              휴일·리모트 없는 주·다른 근태 기록(기록이 우선)
            </li>
          </ul>
          <RemoteCaptureButtons
            groups={groups}
            unassigned={unassigned}
            days={days}
            dayMarks={dayMarks}
            isSkipWeek={plan.isSkipWeek}
            isPlanned={plan.isPlanned}
          />
          <div className="overflow-x-auto">
            <RemoteTable
              groups={groups}
              unassigned={unassigned}
              days={days}
              today={today}
              dayMarks={dayMarks}
              records={records}
              isSkipWeek={plan.isSkipWeek}
              isPlanned={plan.isPlanned}
              isEdited={plan.isEdited}
              disabled={pending}
              onToggleCell={(name, date, remote) => run(() => actions.setCell(name, date, remote))}
              onToggleWeek={(week, skip) => run(() => actions.setSkipWeek(week, skip))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
