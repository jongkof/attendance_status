import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@/lib/admin/actions";

/** 관리 화면 머리글의 이동 링크와 로그아웃. */
export function AdminNav() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        관리자 현황표
      </Link>
      <Link href="/admin/import" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        근태 JSON 반영
      </Link>
      <Link href="/admin/mail" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        현황 메일
      </Link>
      <Link href="/admin/calendar" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        휴일·행사
      </Link>
      <Link href="/admin/password" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        비밀번호 변경
      </Link>
      <form action={logout}>
        <Button type="submit" variant="outline" size="sm">
          로그아웃
        </Button>
      </form>
    </div>
  );
}
