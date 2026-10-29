"use client";

import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RemoteGroup } from "@/lib/remote";

/** 팀원을 눌러 선택하고 옮길 조의 버튼을 눌러 배정한다. 조 이름은 바로 고치고, 조를 추가·삭제한다. */
export function RemoteGroupsEditor({
  groups,
  unassigned,
  selected,
  pending,
  onSelect,
  onMove,
  onRename,
  onAdd,
  onDelete,
}: {
  groups: readonly RemoteGroup[];
  unassigned: readonly string[];
  selected: string | null;
  pending: boolean;
  onSelect: (name: string | null) => void;
  /** groupId가 null이면 미배정으로 옮긴다. */
  onMove: (groupId: number | null) => void;
  onRename: (id: number, name: string) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  const chips = (members: readonly string[]) =>
    members.map((name) => (
      <Button
        key={name}
        type="button"
        size="xs"
        variant={name === selected ? "default" : "outline"}
        aria-pressed={name === selected}
        onClick={() => onSelect(name === selected ? null : name)}
      >
        {name}
      </Button>
    ));
  const isIn = (members: readonly string[]) => selected !== null && members.includes(selected);
  const moveButton = (groupId: number | null, members: readonly string[]) =>
    selected && !isIn(members) ? (
      <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => onMove(groupId)}>
        {selected}을(를) 여기로 옮기기
      </Button>
    ) : null;

  return (
    <div className="flex flex-col gap-3">
      {groups.every((group) => group.members.length === 0) ? (
        <p className="rounded-md border bg-accent/50 px-3 py-2 text-sm">
          아직 편성된 조가 없습니다. 팀원을 눌러 선택한 뒤, 옮길 조의 “여기로 옮기기”를 누르세요.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <section aria-label="미배정" className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">미배정</h3>
            <span className="text-xs text-muted-foreground">{unassigned.length}명</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {unassigned.length > 0 ? (
              chips(unassigned)
            ) : (
              <span className="text-xs text-muted-foreground">모든 팀원이 배정되었습니다</span>
            )}
          </div>
          {moveButton(null, unassigned)}
        </section>
        {groups.map((group) => (
          <section key={group.id} aria-label={group.name} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <Input
                key={group.name}
                aria-label="조 이름"
                defaultValue={group.name}
                className="h-8 max-w-40 font-semibold"
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next === "") event.target.value = group.name;
                  else if (next !== group.name) onRename(group.id, next);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{group.members.length}명</span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pending}
                  title="조 삭제 (팀원은 미배정으로)"
                  aria-label={`${group.name} 삭제`}
                  onClick={() => onDelete(group.id)}
                >
                  삭제
                </Button>
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {group.members.length > 0 ? chips(group.members) : <span className="text-xs text-muted-foreground">비어 있음</span>}
            </div>
            {moveButton(group.id, group.members)}
          </section>
        ))}
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onAdd}>
          <PlusIcon /> 조 추가
        </Button>
      </div>
    </div>
  );
}
