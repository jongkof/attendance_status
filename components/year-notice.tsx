import { YearNoticeAlert } from "@/components/year-notice-alert";
import { todayInSeoul } from "@/lib/attendance";
import { unregisteredYearNotices, type YearNoticeKind } from "@/lib/calendar";
import { getCalendarEntries } from "@/lib/calendar/store";

/**
 * 관리자 화면(달력 편집, 현황표, 메일 미리보기)에 붙이는 공휴일 미등록 연도 안내.
 * 안내 때문에 화면이 깨지지 않도록 읽기에 실패하면 아무것도 보이지 않는다(각 화면이 자기 오류를 따로 알린다).
 */
export async function YearNotice({ year }: { year: number }) {
  const today = todayInSeoul();
  const nextYear = Number(today.slice(0, 4)) + 1;
  let notices: YearNoticeKind[] = [];
  try {
    const entries = await getCalendarEntries({
      from: `${Math.min(year, nextYear)}-01-01`,
      to: `${Math.max(year, nextYear)}-12-31`,
    });
    notices = unregisteredYearNotices(entries, year, today);
  } catch {
    // 읽지 못하면 안내만 생략한다.
  }
  return <YearNoticeAlert notices={notices} />;
}
