/** 이미지로 그릴 표의 모양. 리모트 표와 면담 표가 같은 모양으로 바꿔 넘기면 같은 그림이 나온다. */

export type CaptureCell = {
  fill?: string;
  stroke?: string;
  /** 칸 안의 글자("리"처럼 한 글자) */
  text?: string;
  textColor?: string;
  /** 오른쪽 위 모서리의 면담 플래그 */
  flag?: boolean;
  /** 소속 아님처럼 흐리게 그리는 칸 */
  faded?: boolean;
};

export type CaptureDay = {
  date: string;
  /** 날짜의 일(1~31) */
  day: number;
  weekday: string;
  holiday: string | null;
  /** 월요일 열: 왼쪽에 주 경계선을 긋는다 */
  weekStart: boolean;
};

export type CaptureBlock = {
  /** 조 이름. 미배정 묶음은 null이고 조 배경이 없다. */
  name: string | null;
  rows: { name: string; cells: CaptureCell[] }[];
};

export type CaptureLegendItem = { label: string; cell?: CaptureCell };

export type CaptureTable = {
  title: string;
  days: CaptureDay[];
  /** 날짜 머리글 위에 bannerText("리모트 없음")를 적을 주의 열 범위 */
  bannerWeeks?: { first: number; count: number }[];
  bannerText?: string;
  blocks: CaptureBlock[];
  legend: CaptureLegendItem[];
};
