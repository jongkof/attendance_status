"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin/auth";
import { todayInSeoul } from "@/lib/attendance";
import { toggleUnconfirmed as toggle, type ToggleResult } from "@/lib/attendance/store";

const LOGIN_REQUIRED = "로그인이 필요합니다. 관리자 로그인 후 다시 시도해 주세요.";

/** 일정 없는 칸의 미확인(?)을 켜고 끈다. 서버에서 규칙을 다시 검사한다. */
export async function toggleUnconfirmed(name: string, date: string): Promise<ToggleResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  try {
    const result = await toggle(String(name), String(date), todayInSeoul());
    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/admin");
    }
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "미확인 표시를 바꾸지 못했습니다." };
  }
}
