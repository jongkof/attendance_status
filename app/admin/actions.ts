"use server";

import { revalidatePath } from "next/cache";

import { todayInSeoul } from "@/lib/attendance";
import { toggleUnconfirmed as toggle, type ToggleResult } from "@/lib/attendance/store";

/** 일정 없는 칸의 미확인(?)을 켜고 끈다. 서버에서 규칙을 다시 검사한다. */
export async function toggleUnconfirmed(name: string, date: string): Promise<ToggleResult> {
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
