import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatMonth, shiftMonth } from "@/lib/attendance";

/** 이전 달 · 이번 달 · 다음 달 이동. basePath는 현황표가 있는 주소("/" 또는 "/admin")다. */
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
      <Link href={basePath} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        이번 달
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
