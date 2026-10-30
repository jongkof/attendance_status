/** 팀원의 재직 기간. 둘 다 null이면 처음부터 재직 중이다. removedOn 당일부터 재직이 아니다. */
export type Tenure = {
  /** YYYY-MM-DD */
  start: string | null;
  /** YYYY-MM-DD */
  removedOn: string | null;
};

/** 표시 순서(sort_order)대로 읽은 팀원 한 명. */
export type Member = { id: number; name: string } & Tenure;
