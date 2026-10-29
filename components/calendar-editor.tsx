"use client";

import { CircleAlertIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { weekdayLabel } from "@/lib/attendance";
import { ENTRY_KINDS, KIND_LABEL, type EntryKind } from "@/lib/calendar";

export type CalendarRow = {
  /** 저장된 항목의 번호. 규칙 휴일은 null */
  id: number | null;
  date: string;
  kind: EntryKind;
  name: string;
  /** 규칙으로 계산되는 회사 휴일(수정·삭제 불가) */
  rule: boolean;
};

type Input = { date: string; kind: string; name: string };
type Result = { ok: true } | { ok: false; error: string };

type Props = {
  year: number;
  rows: CalendarRow[];
  actions: {
    add: (input: Input) => Promise<Result>;
    update: (id: number, input: Input) => Promise<Result>;
    remove: (id: number) => Promise<Result>;
  };
};

const EMPTY: Input = { date: "", kind: "holiday", name: "" };

function EntryFields({
  value,
  onChange,
  idPrefix,
}: {
  value: Input;
  onChange: (next: Input) => void;
  idPrefix: string;
}) {
  return (
    <>
      <Input
        id={`${idPrefix}-date`}
        type="date"
        aria-label="날짜"
        value={value.date}
        onChange={(event) => onChange({ ...value, date: event.target.value })}
        className="w-40"
      />
      <NativeSelect aria-label="종류" value={value.kind} onChange={(event) => onChange({ ...value, kind: event.target.value })}>
        {ENTRY_KINDS.map((kind) => (
          <NativeSelectOption key={kind} value={kind}>
            {KIND_LABEL[kind]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        id={`${idPrefix}-name`}
        aria-label="이름"
        placeholder="예: 임시 휴일, 야유회"
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        className="min-w-48 flex-1"
      />
    </>
  );
}

export function CalendarEditor({ year, rows, actions }: Props) {
  const [adding, setAdding] = useState<Input>(EMPTY);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Input>(EMPTY);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const keyOf = (row: CalendarRow) => `${row.id}`;

  function run(job: () => Promise<Result>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await job();
      if (!result.ok) setError(result.error);
      else onDone?.();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>항목 추가</CardTitle>
          <CardDescription>날짜와 종류, 이름을 입력해 하루에 하나씩 추가합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              run(() => actions.add(adding), () => setAdding({ ...EMPTY, kind: adding.kind }));
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-date">새 항목</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  <EntryFields value={adding} onChange={setAdding} idPrefix="add" />
                  <Button type="submit" disabled={pending}>
                    {pending ? <Spinner data-icon="inline-start" /> : null}
                    추가
                  </Button>
                </div>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>저장하지 못했습니다</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{year}년 항목 {rows.length}건</CardTitle>
          <CardDescription>
            규칙 표시가 있는 회사 휴일(근로자의 날, 회사창립기념일, 노조창립기념일)은 날짜가 자동으로 정해져 고칠 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">이 해에 등록된 항목이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>종류</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const key = keyOf(row);
                    const editing = !row.rule && editingKey === key;
                    return (
                      <TableRow key={`${row.rule ? "rule" : "entry"}-${row.date}-${row.kind}-${row.id}`}>
                        {editing ? (
                          <TableCell colSpan={3}>
                            <div className="flex flex-wrap items-center gap-2">
                              <EntryFields value={draft} onChange={setDraft} idPrefix={`edit-${key}`} />
                            </div>
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="whitespace-nowrap">
                              {row.date} ({weekdayLabel(row.date)})
                            </TableCell>
                            <TableCell>
                              <Badge variant={row.kind === "holiday" ? "secondary" : "outline"}>{KIND_LABEL[row.kind]}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-normal">
                              {row.name}
                              {row.rule ? <Badge variant="outline" className="ml-2">규칙</Badge> : null}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right whitespace-nowrap">
                          {row.rule ? (
                            <span className="text-xs text-muted-foreground">자동</span>
                          ) : editing ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                disabled={pending}
                                onClick={() => run(() => actions.update(row.id!, draft), () => setEditingKey(null))}
                              >
                                저장
                              </Button>
                              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditingKey(null)}>
                                취소
                              </Button>
                            </div>
                          ) : confirmingKey === key ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={pending}
                                onClick={() => run(() => actions.remove(row.id!), () => setConfirmingKey(null))}
                              >
                                정말 삭제
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmingKey(null)}>
                                취소
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                aria-label={`${row.date} ${row.name} 수정`}
                                onClick={() => {
                                  setError(null);
                                  setConfirmingKey(null);
                                  setEditingKey(key);
                                  setDraft({ date: row.date, kind: row.kind, name: row.name });
                                }}
                              >
                                수정
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`${row.date} ${row.name} 삭제`}
                                onClick={() => {
                                  setError(null);
                                  setEditingKey(null);
                                  setConfirmingKey(key);
                                }}
                              >
                                삭제
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
