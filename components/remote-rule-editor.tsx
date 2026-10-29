"use client";

import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ALL_STEPS, REST_STEP } from "@/lib/remote";
import { cn } from "@/lib/utils";

const PRESETS: { label: string; steps: string[] }[] = [
  { label: "월 화 수 목 금", steps: ["월", "화", "수", "목", "금"] },
  { label: "화 목 수 금 (과거 규칙)", steps: ["화", "목", "수", "금"] },
  { label: "월~금 + 쉼", steps: ["월", "화", "수", "목", "금", REST_STEP] },
];

export type RuleDraft = { from: string; order: string[]; starts: Record<string, number> };

function reorder(steps: string[], index: number, delta: number) {
  const next = [...steps];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}

/** 요일 순서, 기준 주, 조별 시작 요일. 바꾼 값은 부모의 초안에만 담기고 "적용"하기 전에는 저장되지 않는다. */
export function RemoteRuleEditor({
  draft,
  baseWeekLabel,
  filledGroups,
  startOf,
  onChange,
}: {
  draft: RuleDraft;
  /** 기준 주 안내에 쓰는 "10/19" 같은 표기 */
  baseWeekLabel: string;
  filledGroups: readonly { id: number; name: string }[];
  /** 조의 현재 시작 단계(order 안의 위치). 초안에 값이 없으면 부모가 기본값을 준다. */
  startOf: (groupId: number) => number;
  onChange: (next: RuleDraft) => void;
}) {
  const { order } = draft;
  const currentStarts = () => Object.fromEntries(filledGroups.map((group) => [String(group.id), startOf(group.id)]));

  // 단계가 바뀌면 조별 시작 위치가 어긋나므로, 지금 보이는 시작 단계 이름을 따라가도록 다시 계산한다.
  const withOrder = (next: string[]): RuleDraft => {
    const starts: Record<string, number> = {};
    for (const group of filledGroups) {
      const found = next.indexOf(order[startOf(group.id)]);
      starts[String(group.id)] = found >= 0 ? found : Math.min(startOf(group.id), Math.max(next.length - 1, 0));
    }
    return { ...draft, order: next, starts };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          요일 순서 · 모든 조가 같은 순서를 돌고, “리모트 없음” 단계를 넣으면 그 주는 쉽니다
        </p>
        <ol className="flex flex-wrap items-center gap-1" aria-label="요일 순서">
          {order.length === 0 ? <li className="text-xs text-muted-foreground">단계가 없습니다</li> : null}
          {order.map((step, index) => (
            <li key={step} className="flex items-center gap-1">
              {index > 0 ? <ArrowRightIcon className="size-3 text-muted-foreground" aria-hidden /> : null}
              <span
                className={cn(
                  "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-sm",
                  step === REST_STEP && "border-dashed bg-muted",
                )}
              >
                <span className="text-xs text-muted-foreground">{index + 1}</span>
                {step}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={index === 0}
                  aria-label={`${step} 앞으로`}
                  onClick={() => onChange(withOrder(reorder(order, index, -1)))}
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={index === order.length - 1}
                  aria-label={`${step} 뒤로`}
                  onClick={() => onChange(withOrder(reorder(order, index, 1)))}
                >
                  <ChevronRightIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`${step} 삭제`}
                  onClick={() => onChange(withOrder(order.filter((_, i) => i !== index)))}
                >
                  <XIcon />
                </Button>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">단계 추가</span>
          {ALL_STEPS.filter((step) => !order.includes(step)).map((step) => (
            <Button key={step} type="button" size="xs" variant="outline" onClick={() => onChange(withOrder([...order, step]))}>
              + {step}
            </Button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">프리셋</span>
          {PRESETS.map((preset) => (
            <Button key={preset.label} type="button" size="xs" variant="outline" onClick={() => onChange(withOrder(preset.steps))}>
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          기준 주
          <Input
            type="date"
            aria-label="기준 주"
            value={draft.from}
            onChange={(event) => {
              if (event.target.value) onChange({ ...draft, from: event.target.value });
            }}
            className="w-40"
          />
        </label>
        <span className="text-xs text-muted-foreground">
          고른 날이 속한 주({baseWeekLabel} 주)가 기준 주입니다. 요일은 상관없습니다.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">기준 주의 조별 리모트 요일</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {filledGroups.length === 0 ? <span className="text-xs text-muted-foreground">편성된 조가 없습니다</span> : null}
          {filledGroups.map((group) => (
            <label key={group.id} className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{group.name}</span>
              <NativeSelect
                size="sm"
                aria-label={`${group.name} 시작 요일`}
                value={startOf(group.id)}
                disabled={order.length === 0}
                onChange={(event) =>
                  onChange({ ...draft, starts: { ...currentStarts(), [String(group.id)]: Number(event.target.value) } })
                }
              >
                {order.map((step, index) => (
                  <NativeSelectOption key={step} value={index}>
                    {step === REST_STEP ? "쉼" : step}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
