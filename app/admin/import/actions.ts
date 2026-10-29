"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin/auth";
import { planImport, type ApplyResult, type ImportPlan } from "@/lib/attendance";
import { getRecords, getRoster, saveChanges } from "@/lib/attendance/store";

const LOGIN_REQUIRED = "로그인이 필요합니다. 관리자 로그인 후 다시 시도해 주세요.";

async function plan(text: string): Promise<ImportPlan> {
  const [roster, existing] = await Promise.all([getRoster(), getRecords()]);
  return planImport(text, { roster, existing });
}

/** 저장 없이 반영 계획만 돌려준다. */
export async function previewImport(text: string): Promise<ImportPlan> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  try {
    return await plan(text);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "미리보기를 만들지 못했습니다." };
  }
}

/** 붙여 넣은 JSON을 서버에서 다시 계획해 새로 생기거나 바뀌는 칸만 저장한다. */
export async function applyImport(text: string): Promise<ApplyResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  try {
    const result = await plan(text);
    if (!result.ok) return result;

    const count = (status: string) => result.changes.filter((c) => c.status === status).length;
    const writes = result.changes.filter((c) => c.status === "new" || c.status === "changed");
    await saveChanges(writes);
    revalidatePath("/");

    return {
      ok: true,
      created: count("new"),
      changed: count("changed"),
      skipped: count("skipped"),
      unchanged: count("unchanged"),
      firstDate: writes.map((c) => c.next.date).sort()[0] ?? null,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "반영하지 못했습니다." };
  }
}
