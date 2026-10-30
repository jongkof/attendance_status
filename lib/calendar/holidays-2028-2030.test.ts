import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20261031010000_holidays_2028_2030.sql"),
  "utf8",
);

type Row = { date: string; kind: string; name: string };

const rows: Row[] = [...sql.matchAll(/\('(\d{4}-\d{2}-\d{2})', '(\w+)', '([^']+)'\)/g)].map(
  (m) => ({ date: m[1], kind: m[2], name: m[3] }),
);

const YEARS = [2028, 2029, 2030];
const datesOf = (year: number) =>
  rows.filter((r) => r.date.startsWith(`${year}-`)).map((r) => r.date);
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

describe("2028–2030 정부 공휴일 SQL", () => {
  test("날짜 형식이 올바르고 모두 휴일 종류다", () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(new Date(`${r.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(r.date);
      expect(r.kind).toBe("holiday");
    }
  });

  test("같은 날짜가 두 번 나오지 않고 충돌 시 건너뛴다", () => {
    const dates = rows.map((r) => r.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect(sql).toContain("on conflict (entry_date, kind) do nothing");
  });

  test("연도별 건수와 날짜 범위", () => {
    expect(datesOf(2028)).toHaveLength(18);
    expect(datesOf(2029)).toHaveLength(20);
    expect(datesOf(2030)).toHaveLength(19);
    expect(rows.every((r) => YEARS.includes(Number(r.date.slice(0, 4))))).toBe(true);
  });

  test("날짜순으로 적혀 있다", () => {
    const dates = rows.map((r) => r.date);
    expect(dates).toEqual([...dates].sort());
  });

  test.each(YEARS)("%i년에 고정 공휴일이 모두 있다", (year) => {
    const has = (md: string) => datesOf(year).includes(`${year}-${md}`);
    for (const md of ["01-01", "03-01", "05-05", "06-06", "07-17", "08-15", "10-03", "10-09", "12-25"]) {
      expect(has(md)).toBe(true);
    }
  });

  test.each(YEARS)("%i년 설날과 추석은 전일·당일·익일·그 익일의 연속 4일이다", (year) => {
    for (const label of ["설날", "추석"]) {
      const days = rows.filter((r) => r.date.startsWith(`${year}-`) && /^(설날|추석)(·개천절)?$/.test(r.name) && r.name.startsWith(label));
      expect(days).toHaveLength(1);
      const day = days[0].date;
      const present = datesOf(year);
      for (const offset of [-1, 0, 1, 2]) {
        expect(present).toContain(addDays(day, offset));
      }
      // 연휴 이름은 당일 앞뒤 날에만 붙는다.
      const eves = rows.filter((r) => r.name === `${label} 연휴`).filter((r) => r.date.startsWith(`${year}-`));
      for (const r of eves) {
        expect([-1, 1, 2]).toContain((Date.parse(r.date) - Date.parse(day)) / 86400000);
      }
    }
  });

  test("대체공휴일은 원래 공휴일이 주말이거나 다른 공휴일과 겹칠 때만 있고 평일이다", () => {
    const subs = rows.filter((r) => r.name.endsWith(" 대체공휴일"));
    expect(subs.map((r) => r.date)).toEqual([
      "2028-10-05",
      "2029-05-07",
      "2029-05-21",
      "2029-09-24",
      "2030-02-05",
      "2030-05-06",
    ]);
    const saturdayToo = ["어린이날", "3·1절", "광복절", "개천절", "한글날"];
    for (const sub of subs) {
      expect([0, 6]).not.toContain(weekday(sub.date));
      const label = sub.name.replace(" 대체공휴일", "");
      const year = sub.date.slice(0, 4);
      if (label === "설날" || label === "추석") {
        // 명절 연휴 3일(당일 앞뒤 하루) 중 일요일이 있어야 한다.
        const day = rows.find((r) => r.date.startsWith(year) && r.name === label)!.date;
        expect([-1, 0, 1].some((o) => weekday(addDays(day, o)) === 0)).toBe(true);
      } else {
        const originals = rows.filter(
          (r) => r.date.startsWith(year) && r.name.includes(label) && !r.name.endsWith("대체공휴일"),
        );
        expect(originals).toHaveLength(1);
        const wd = weekday(originals[0].date);
        const overlapsOther = rows.some(
          (r) => r.date === originals[0].date && r.name !== originals[0].name,
        ) || originals[0].name.includes("추석");
        expect(wd === 0 || (wd === 6 && saturdayToo.includes(label)) || overlapsOther).toBe(true);
      }
    }
  });

  test("대체공휴일이 필요한 공휴일에는 빠짐없이 있다", () => {
    const names = (year: number) => rows.filter((r) => r.date.startsWith(`${year}-`)).map((r) => r.name);
    expect(names(2029)).toEqual(expect.arrayContaining(["어린이날 대체공휴일", "부처님오신날 대체공휴일", "추석 대체공휴일"]));
    expect(names(2030)).toEqual(expect.arrayContaining(["설날 대체공휴일", "어린이날 대체공휴일"]));
    expect(names(2028)).toContain("개천절 대체공휴일");
  });

  test("음력 휴일 날짜가 공식 자료와 같다", () => {
    const find = (name: string, year: number) =>
      rows.find((r) => r.date.startsWith(`${year}-`) && r.name === name)?.date;
    expect(find("설날", 2028)).toBe("2028-01-27");
    expect(find("설날", 2029)).toBe("2029-02-13");
    expect(find("설날", 2030)).toBe("2030-02-03");
    expect(find("부처님오신날", 2028)).toBe("2028-05-02");
    expect(find("부처님오신날", 2029)).toBe("2029-05-20");
    expect(find("부처님오신날", 2030)).toBe("2030-05-09");
    expect(find("추석·개천절", 2028)).toBe("2028-10-03");
    expect(find("추석", 2029)).toBe("2029-09-22");
    expect(find("추석", 2030)).toBe("2030-09-12");
  });

  test("확인되지 않은 선거일과 회사 규정 휴일은 들어 있지 않다", () => {
    expect(rows.some((r) => r.name.includes("지방선거") || r.name.includes("대통령선거"))).toBe(false);
    expect(rows.some((r) => ["근로자의 날", "회사창립기념일", "노조창립기념일"].includes(r.name))).toBe(false);
    expect(rows.find((r) => r.name === "국회의원선거일")?.date).toBe("2028-04-12");
  });
});
