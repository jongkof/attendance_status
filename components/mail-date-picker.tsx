"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 본문을 만들 날짜를 고른다. 바꾸면 그 날의 본문으로 이동한다. */
export function MailDatePicker({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const go = (next: string) => router.push(next === today ? "/admin/mail" : `/admin/mail?date=${next}`);

  return (
    <div className="flex w-fit flex-wrap items-center gap-2">
      <Label htmlFor="mail-date">날짜</Label>
      <Input
        id="mail-date"
        type="date"
        value={date}
        onChange={(event) => event.target.value && go(event.target.value)}
        className="w-44"
      />
      {date === today ? null : (
        <Button type="button" variant="outline" size="sm" onClick={() => go(today)}>
          오늘로
        </Button>
      )}
    </div>
  );
}
