import { isValidDate, weekdaysBetween } from "./calendar";
import {
  ATTENDANCE_TYPES,
  type AttendanceChange,
  type AttendanceRecord,
  type AttendanceType,
  type ChangeStatus,
  type ImportPlan,
  type RecordIssue,
} from "./types";

type PlanContext = {
  roster: readonly string[];
  /** 이미 저장된 근태 기록 */
  existing: readonly AttendanceRecord[];
};

const NEEDS_CHECK = "확인 필요";

function cell(name: string, date: string) {
  return `${name}\u0000${date}`;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

type ParsedRecord = {
  index: number;
  name: string;
  type: AttendanceType;
  start: string;
  end: string;
  period: string | null;
  time: string | null;
  note: string | null;
  receivedAt: string;
};

function parseRecord(raw: unknown, index: number): ParsedRecord | RecordIssue {
  const item = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const name = typeof item.name === "string" && item.name.trim() !== "" ? item.name.trim() : null;
  const invalid = (reason: string): RecordIssue => ({ index, name, kind: "invalid", reason });

  if (name === null) return invalid("이름이 없습니다.");
  if (!ATTENDANCE_TYPES.includes(item.type as AttendanceType)) {
    return invalid(`근태 유형이 올바르지 않습니다: ${String(item.type)}`);
  }
  const { start, end, receivedAt } = item;
  if (typeof start !== "string" || !isValidDate(start)) return invalid("시작일(start)이 올바르지 않습니다.");
  if (typeof end !== "string" || !isValidDate(end)) return invalid("종료일(end)이 올바르지 않습니다.");
  if (start > end) return invalid("시작일이 종료일보다 늦습니다.");
  if (typeof receivedAt !== "string" || Number.isNaN(Date.parse(receivedAt))) {
    return invalid("수신 시각(receivedAt)이 올바르지 않습니다.");
  }

  return {
    index,
    name,
    type: item.type as AttendanceType,
    start,
    end,
    period: textOrNull(item.period),
    time: textOrNull(item.time),
    note: textOrNull(item.note),
    receivedAt,
  };
}

function isIssue(value: ParsedRecord | RecordIssue): value is RecordIssue {
  return "kind" in value;
}

/**
 * 붙여 넣은 근태 JSON을 읽어 반영 계획을 만든다. 저장은 하지 않는다.
 * 같은 사람·같은 날짜는 수신 시각이 가장 늦은 공지가 이기고, 수신 시각이 같으면 뒤에 나온 쪽이 이긴다.
 */
export function planImport(text: string, context: PlanContext): ImportPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON으로 읽을 수 없습니다. Copilot이 만든 JSON 전체를 그대로 붙여 넣어 주세요." };
  }
  const records = (parsed as { records?: unknown } | null)?.records;
  if (!Array.isArray(records)) {
    return { ok: false, error: "records 배열이 없습니다. Copilot이 만든 JSON 전체를 붙여 넣었는지 확인해 주세요." };
  }

  const roster = new Set(context.roster);
  const issues: RecordIssue[] = [];
  const incoming = new Map<string, AttendanceRecord>();

  records.forEach((raw, index) => {
    const record = parseRecord(raw, index);
    if (isIssue(record)) {
      issues.push(record);
      return;
    }
    if (!roster.has(record.name)) {
      issues.push({ index, name: record.name, kind: "unknown-name", reason: "팀원 명단에 없는 이름입니다." });
      return;
    }
    const days = weekdaysBetween(record.start, record.end);
    if (days.length === 0) {
      issues.push({ index, name: record.name, kind: "invalid", reason: "근무일(월–금)이 없는 기간입니다." });
      return;
    }
    for (const date of days) {
      const next: AttendanceRecord = {
        name: record.name,
        date,
        type: record.type,
        period: record.period,
        time: record.time,
        note: record.note,
        receivedAt: record.receivedAt,
      };
      const key = cell(record.name, date);
      const current = incoming.get(key);
      if (!current || Date.parse(next.receivedAt) >= Date.parse(current.receivedAt)) {
        incoming.set(key, next);
      }
    }
  });

  const stored = new Map(context.existing.map((r) => [cell(r.name, r.date), r]));
  const changes: AttendanceChange[] = [...incoming.values()].map((next) => {
    const previous = stored.get(cell(next.name, next.date)) ?? null;
    return {
      status: statusAgainst(previous, next),
      next,
      previous,
      needsCheck: next.note?.includes(NEEDS_CHECK) ?? false,
    };
  });

  return { ok: true, issues, changes };
}

function statusAgainst(previous: AttendanceRecord | null, next: AttendanceRecord): ChangeStatus {
  if (!previous) return "new";
  if (Date.parse(next.receivedAt) < Date.parse(previous.receivedAt)) return "skipped";
  const sameContent =
    previous.type === next.type &&
    previous.period === next.period &&
    previous.time === next.time &&
    previous.note === next.note;
  return sameContent ? "unchanged" : "changed";
}
