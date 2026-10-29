import { ALL_STEPS, type RemoteRule } from "./types";

export type RuleCheck = { ok: true } | { ok: false; error: string };

/** 요일 순서가 비었거나 팀원이 있는 조가 단계 수보다 많으면 적용할 수 없다. */
export function checkRuleShape(stepCount: number, filledGroupCount: number): RuleCheck {
  if (stepCount === 0) return { ok: false, error: "요일 단계가 없어 저장할 수 없습니다." };
  if (filledGroupCount > stepCount) {
    return {
      ok: false,
      error: `조가 ${filledGroupCount}개인데 요일 단계는 ${stepCount}개라 저장할 수 없습니다. 단계를 늘리거나 조를 줄이세요.`,
    };
  }
  return { ok: true };
}

/** 서버에서 받은 규칙 입력을 다시 확인한다(조 수 검사는 호출하는 쪽에서 checkRuleShape로 한다). */
export function checkRuleInput(rule: RemoteRule): RuleCheck {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rule.from) || Number.isNaN(Date.parse(rule.from))) {
    return { ok: false, error: "기준 주 날짜가 올바르지 않습니다." };
  }
  if (!Array.isArray(rule.order) || rule.order.some((step) => !ALL_STEPS.includes(step))) {
    return { ok: false, error: "요일 순서에 알 수 없는 단계가 있습니다." };
  }
  if (new Set(rule.order).size !== rule.order.length) return { ok: false, error: "요일 단계가 겹칩니다." };
  const starts = Object.values(rule.starts ?? {});
  if (starts.some((start) => !Number.isInteger(start) || start < 0 || start >= rule.order.length)) {
    return { ok: false, error: "조별 시작 요일이 요일 순서 안에 없습니다." };
  }
  return { ok: true };
}
