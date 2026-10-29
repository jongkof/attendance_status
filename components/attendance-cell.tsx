"use client";

import { CELL_BOX, TYPE_COLOR, TYPE_LETTER } from "@/components/attendance-style";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { describeRecord, shortDate, type AttendanceRecord } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export function AttendanceCell({ record }: { record: AttendanceRecord }) {
  const label = describeRecord(record);
  const details = [record.time, record.note].filter(Boolean).join(" · ");
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          CELL_BOX,
          TYPE_COLOR[record.type],
          "cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        title={details ? `${label} · ${details}` : label}
        aria-label={`${record.name} ${shortDate(record.date)} ${label}`}
      >
        {TYPE_LETTER[record.type]}
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>
            {record.name} · {shortDate(record.date)}
          </PopoverTitle>
        </PopoverHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">근태</dt>
          <dd>{label}</dd>
          {record.time ? (
            <>
              <dt className="text-muted-foreground">시간</dt>
              <dd>{record.time}</dd>
            </>
          ) : null}
          {record.note ? (
            <>
              <dt className="text-muted-foreground">비고</dt>
              <dd>{record.note}</dd>
            </>
          ) : null}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
