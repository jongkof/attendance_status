import type { RuleHoliday } from "./types";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * 회사 규정으로 날짜가 정해지는 휴일을 날짜순으로 돌려준다.
 * 근로자의 날(5/1), 회사창립기념일(4월 둘째 금요일), 노조창립기념일(5/30).
 * 주말과 겹쳐도 다른 날로 대신 쉬지 않는다(대체가 필요하면 관리자가 휴일을 따로 등록한다).
 */
export function ruleHolidays(year: number): RuleHoliday[] {
  const aprilFirstWeekday = new Date(Date.UTC(year, 3, 1)).getUTCDay(); // 0=일 … 5=금
  const firstFriday = 1 + ((5 - aprilFirstWeekday + 7) % 7);
  const secondFriday = firstFriday + 7;

  return [
    { date: `${year}-04-${pad(secondFriday)}`, name: "회사창립기념일" },
    { date: `${year}-05-01`, name: "근로자의 날" },
    { date: `${year}-05-30`, name: "노조창립기념일" },
  ];
}
