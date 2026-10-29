import { HOLIDAY_BOX, LEGEND, TYPE_COLOR, TYPE_LETTER, UNCONFIRMED_BOX } from "@/components/attendance-style";
import { cn } from "@/lib/utils";

/** 범례 견본: 칸과 같은 모양의 작은 정사각형에 같은 한 글자를 적는다. */
const SWATCH = "flex size-4 items-center justify-center rounded-sm text-[10px] leading-none font-semibold";

export function AttendanceLegend() {
  return (
    <ul aria-label="범례" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {LEGEND.map(({ label, type }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden className={cn(SWATCH, TYPE_COLOR[type])}>
            {TYPE_LETTER[type]}
          </span>
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden className={cn(SWATCH, UNCONFIRMED_BOX, "leading-none")}>
          ?
        </span>
        미확인
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className={cn(SWATCH, HOLIDAY_BOX)} />
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
