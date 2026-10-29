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

/** 조 편성 전체. unassigned는 어느 조에도 없는 팀원이다. */
export type RemoteSetup = {
  groups: RemoteGroup[];
  unassigned: string[];
  /** from 오름차순 */
  rules: RemoteRule[];
};
