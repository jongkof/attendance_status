import type { AttendanceType } from "@/lib/attendance";

/** 칸을 채우는 색. Tailwind가 클래스 이름을 찾을 수 있도록 문자열 전체를 그대로 적는다. */
export const TYPE_COLOR: Record<AttendanceType, string> = {
  출근: "bg-att-work text-att-work-foreground",
  휴가: "bg-att-leave text-att-leave-foreground",
  반차: "bg-att-half text-att-half-foreground",
  반반차: "bg-att-half text-att-half-foreground",
  리모트: "bg-att-remote text-att-remote-foreground",
  출장: "bg-att-trip text-att-trip-foreground",
  교육: "bg-att-training text-att-training-foreground",
  건강검진: "bg-att-checkup text-att-checkup-foreground",
};

/** 범례에 보여 줄 순서와 이름. 반차와 반반차는 같은 색이라 한 항목으로 묶는다. */
export const LEGEND: { label: string; type: AttendanceType }[] = [
  { label: "출근(일정 없음)", type: "출근" },
  { label: "휴가", type: "휴가" },
  { label: "반차·반반차", type: "반차" },
  { label: "리모트", type: "리모트" },
  { label: "출장", type: "출장" },
  { label: "교육", type: "교육" },
  { label: "건강검진", type: "건강검진" },
];

/** 한 칸의 크기. 기록이 없는 칸도 같은 크기를 쓴다. */
export const CELL_BOX = "flex h-10 w-full items-center justify-center rounded-sm";

/** 미확인(?) 칸: 색 없이 바탕에 점선 테두리만 둔 빈칸. */
export const UNCONFIRMED_BOX =
  "border border-dashed border-foreground/50 bg-background text-sm font-bold text-muted-foreground";

/** 휴일 칸: 근태를 보여 주지 않는 중립 음영. */
export const HOLIDAY_BOX = "bg-muted";
