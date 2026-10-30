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

/** 칸에 적는 한 글자. 출근은 글자 없이 녹색만 보인다. 자세한 구분은 마우스를 올렸을 때 보인다. */
export const TYPE_LETTER: Record<AttendanceType, string> = {
  출근: "",
  휴가: "휴",
  반차: "반",
  반반차: "반",
  리모트: "리",
  출장: "출",
  교육: "교",
  건강검진: "건",
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

/** 한 칸의 크기: 작은 정사각형. 기록이 없는 칸도 같은 크기를 쓴다. */
export const CELL_BOX = "mx-auto block size-6 rounded-sm p-0 text-center text-[11px] leading-6 font-semibold";

/** 눌러서 바꿀 수 있는 칸의 단서: 포인터와 호버 테두리. */
export const TOGGLE_HINT = "cursor-pointer hover:ring-2 hover:ring-foreground/50";

/** 미확인(?) 칸: 색 없이 바탕에 점선 테두리만 둔 빈칸. */
export const UNCONFIRMED_BOX =
  "border border-dashed border-foreground/50 bg-background text-[13px] leading-[1.35rem] font-bold text-muted-foreground";

/** 재직 기간이 아닌 칸("소속 아님"): 근태 없음(녹색)과 달리 칸 모양만 흐리게 남긴다. */
export const NOT_MEMBER_BOX = "border border-dotted border-foreground/20 bg-transparent opacity-40";

/** 휴일 칸: 근태를 보여 주지 않는 중립 음영. */
export const HOLIDAY_BOX = "bg-muted";
