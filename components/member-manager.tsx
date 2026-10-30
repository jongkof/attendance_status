"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isCurrent, type Member } from "@/lib/roster";

type Result = { ok: true } | { ok: false; error: string };

type Props = {
  members: readonly Member[];
  today: string;
  actions: {
    add: (name: string, start: string) => Promise<Result>;
    rename: (id: number, name: string) => Promise<Result>;
    remove: (id: number, removedOn: string) => Promise<Result>;
    restore: (id: number) => Promise<Result>;
  };
};

/** 재직 중인 팀원 목록(시작일, 이름 수정, 제거)과 제거된 팀원 목록(제거일, 제거 취소), 팀원 추가 폼. */
export function MemberManager({ members, today, actions }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState(today);
  // 이름 수정 초안(팀원 번호별), 제거 중인 팀원과 제거일 초안
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [removing, setRemoving] = useState<{ id: number; date: string } | null>(null);

  const active = members.filter((member) => isCurrent(member, today));
  const removed = members.filter((member) => !isCurrent(member, today));

  function run(action: () => Promise<Result>, done?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      done?.();
      router.refresh();
    });
  }

  function clearDraft(id: number) {
    setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== id)));
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>팀원 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                () => actions.add(newName, newStart),
                () => setNewName(""),
              );
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              이름
              <Input value={newName} onChange={(event) => setNewName(event.target.value)} className="w-40" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              시작일
              <Input type="date" value={newStart} onChange={(event) => setNewStart(event.target.value)} className="w-40" />
            </label>
            <Button type="submit" disabled={pending}>
              추가
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">새 팀원은 리모트 조가 미배정으로 시작합니다. 조는 리모트 관리에서 배정하세요.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>재직 중인 팀원 {active.length}명</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {active.map((member) => {
              const draft = drafts[member.id] ?? member.name;
              return (
                <li key={member.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Input
                    aria-label={`${member.name} 이름`}
                    value={draft}
                    onChange={(event) => setDrafts({ ...drafts, [member.id]: event.target.value })}
                    className="w-40"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending || draft === member.name}
                    onClick={() =>
                      run(
                        () => actions.rename(member.id, draft),
                        () => clearDraft(member.id),
                      )
                    }
                  >
                    이름 수정
                  </Button>
                  <span className="text-sm text-muted-foreground">시작일 {member.start ?? "처음부터"}</span>
                  {member.removedOn ? <span className="text-sm text-muted-foreground">제거 예정 {member.removedOn}</span> : null}
                  {removing?.id === member.id ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Input
                        type="date"
                        aria-label={`${member.name} 제거일`}
                        value={removing.date}
                        onChange={(event) => setRemoving({ id: member.id, date: event.target.value })}
                        className="w-40"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => actions.remove(member.id, removing.date),
                            () => setRemoving(null),
                          )
                        }
                      >
                        {removing.date}부터 제거 확인
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setRemoving(null)}>
                        취소
                      </Button>
                    </span>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setRemoving({ id: member.id, date: today })}>
                      제거
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>제거된 팀원 {removed.length}명</CardTitle>
        </CardHeader>
        <CardContent>
          {removed.length === 0 ? (
            <p className="text-sm text-muted-foreground">제거된 팀원이 없습니다.</p>
          ) : (
            <ul className="flex flex-col divide-y opacity-60">
              {removed.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="w-40 font-medium">{member.name}</span>
                  <span className="text-sm">제거일 {member.removedOn}</span>
                  <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => actions.restore(member.id))}>
                    제거 취소
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
