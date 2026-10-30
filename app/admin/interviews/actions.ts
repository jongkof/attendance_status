"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin/auth";
import { isHolidayDate } from "@/lib/calendar/store";
import { checkInterviewCell } from "@/lib/interview";
import { setInterview, type WriteResult } from "@/lib/interview/store";
import { ALWAYS, tenureOf } from "@/lib/roster";
import { getMembers } from "@/lib/roster/store";

const LOGIN_REQUIRED = "로그인이 필요합니다. 관리자 로그인 후 다시 시도해 주세요.";

/** 그 사람·날짜의 면담을 켜거나(true) 끈다. 켤 때만 칸 규칙을 검사하고, 끄는 것은 언제나 가능하다. */
export async function setInterviewCell(name: string, date: string, on: boolean): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  if (typeof name !== "string" || typeof date !== "string" || typeof on !== "boolean") {
    return { ok: false, error: "요청이 올바르지 않습니다." };
  }
  try {
    let memberId: number | undefined;
    if (on) {
      const [members, isHoliday] = await Promise.all([getMembers(), isHolidayDate(date)]);
      const tenure = tenureOf(members)[name] ?? ALWAYS;
      const check = checkInterviewCell({ date, isHoliday, tenure });
      if (!check.ok) return check;
      memberId = members.find((member) => member.name === name)?.id;
    }
    const result = await setInterview(name, date, on, memberId);
    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/admin/interviews");
      revalidatePath("/admin/mail");
    }
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "면담을 바꾸지 못했습니다." };
  }
}
