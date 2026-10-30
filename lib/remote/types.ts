/** 순환 순서 안에서 그 주에 리모트가 없는 단계. */
export const REST_STEP = "리모트 없음";

/** 월–금 순서의 요일 단계. 인덱스가 곧 요일 번호(0=월)다. */
export const WEEKDAY_STEPS = ["월", "화", "수", "목", "금"] as const;

/** 요일 순서에 넣을 수 있는 단계 전부. */
export const ALL_STEPS: readonly string[] = [...WEEKDAY_STEPS, REST_STEP];

/**
 * 순환 규칙. from은 기준 주의 월요일이고, 이 주부터 다음 규칙 직전까지 적용된다.
 * starts는 조 번호(문자열)별로 기준 주에 걸린 order 안의 위치(0부터)다.
 */
export type RemoteRule = {
  from: string;
  order: string[];
  starts: Record<string, number>;
};

export type RemoteGroup = {
  id: number;
  name: string;
  /** 표시 순서대로 */
  members: string[];
};

/** 사람·날짜별 직접 수정. add는 규칙에 없던 리모트를 넣은 것, remove는 규칙의 리모트를 뺀 것이다. */
export type RemoteEdit = { name: string; date: string; kind: "add" | "remove" };

/** 조 편성 전체. unassigned는 어느 조에도 없는 팀원이다. */
export type RemoteSetup = {
  groups: RemoteGroup[];
  unassigned: string[];
  /** from 오름차순 */
  rules: RemoteRule[];
  /** 직접 수정한 칸. 없으면 없는 것으로 본다. */
  edits?: RemoteEdit[];
  /** 관리자가 정한 주(월요일 → 리모트 없음 여부). 있으면 휴일·행사 자동 판정보다 우선한다. */
  skipWeeks?: Record<string, boolean>;
};
