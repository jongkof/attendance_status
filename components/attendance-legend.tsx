import { HOLIDAY_BOX, LEGEND, TYPE_COLOR, UNCONFIRMED_BOX } from "@/components/attendance-style";
import { cn } from "@/lib/utils";

export function AttendanceLegend() {
  return (
    <ul aria-label="범례" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {LEGEND.map(({ label, type }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-3 rounded-sm", TYPE_COLOR[type])} />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden className={cn("flex size-3 items-center justify-center rounded-sm text-[8px]", UNCONFIRMED_BOX)}>
          ?
        </span>
        미확인
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className={cn("size-3 rounded-sm", HOLIDAY_BOX)} />
        <span className="text-destructive">휴일</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="rounded-sm bg-accent px-1 text-[8px] leading-3 text-accent-foreground">
          행사
        </span>
        행사(근무일, 날짜 위에 이름만 표시)
      </li>
    </ul>
  );
}
