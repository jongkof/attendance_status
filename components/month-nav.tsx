"use client";

import Link from "next/link";

import { scrollToToday } from "@/components/scroll-to-today";
import { buttonVariants } from "@/components/ui/button";
import { formatMonth, shiftMonth } from "@/lib/attendance";

/**
 * 이전 달 · 오늘 · 다음 달 이동. basePath는 현황표가 있는 주소("/" 또는 "/admin")다.
 * "오늘"은 현재 달로 이동하고 오늘 열이 보이게 한다. 이미 현재 달이면 스크롤 위치만 맞춘다.
 */
export function MonthNav({ basePath, year, month }: { basePath: string; year: number; month: number }) {
  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  return (
    <nav aria-label="월 이동" className="flex items-center gap-2">
      <Link
        href={`${basePath}?month=${formatMonth(previous.year, previous.month)}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        이전 달
      </Link>
      <Link href={basePath} onClick={() => scrollToToday()} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        오늘
      </Link>
      <Link
        href={`${basePath}?month=${formatMonth(next.year, next.month)}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        다음 달
      </Link>
    </nav>
  );
}
