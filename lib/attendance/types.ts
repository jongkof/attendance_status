export const ATTENDANCE_TYPES = [
  "휴가",
  "반차",
  "반반차",
  "리모트",
  "출장",
  "교육",
  "건강검진",
  "출근",
] as const;

export type AttendanceType = (typeof ATTENDANCE_TYPES)[number];

/** 한 사람의 한 근무일에 대한 유효한 근태 상태 하나. */
export type AttendanceRecord = {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  type: AttendanceType;
  period: string | null;
  time: string | null;
  note: string | null;
  /** 근태 공지 메일을 받은 일시(ISO 8601) */
  receivedAt: string;
};

/** 관리자가 아침 확인 때 `?`로 표시한 일정 없는 칸. */
export type UnconfirmedMark = {
  name: string;
  /** YYYY-MM-DD */
  date: string;
};

export type RecordIssue = {
  /** 근태 JSON `records` 배열에서의 순번(0부터) */
  index: number;
  name: string | null;
  kind: "invalid" | "unknown-name";
  reason: string;
};

export type ChangeStatus = "new" | "changed" | "unchanged" | "skipped";

export type AttendanceChange = {
  status: ChangeStatus;
  next: AttendanceRecord;
  /** 이미 저장된 기록(없으면 null) */
  previous: AttendanceRecord | null;
  /** note에 "확인 필요"가 들어 있는 기록 */
  needsCheck: boolean;
};

export type ApplyResult =
  | { ok: true; created: number; changed: number; skipped: number; unchanged: number; firstDate: string | null }
  | { ok: false; error: string };

export type ImportPlan =
  | { ok: false; error: string }
  | { ok: true; issues: RecordIssue[]; changes: AttendanceChange[] };
