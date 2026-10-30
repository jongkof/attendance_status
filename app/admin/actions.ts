"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin/auth";
import { isHolidayDate } from "@/lib/calendar/store";
import { loadPlan } from "@/app/load-plan";
import { isActiveOn } from "@/lib/roster";
import { getMembers } from "@/lib/roster/store";
import {
  checkCanConfirmRemote,
  checkCellEdit,
  nextMorningState,
  todayInSeoul,
  type CellChoice,
  type MorningState,
} from "@/lib/attendance";
import {
  editCell,
  getConfirmations,
  getRecords,
  setConfirmation,
  toggleUnconfirmed as toggle,
  type ToggleResult,
} from "@/lib/attendance/store";

const LOGIN_REQUIRED = "로그인이 필요합니다. 관리자 로그인 후 다시 시도해 주세요.";

/** 일정 없는 칸의 미확인(?)을 켜고 끈다. 서버에서 규칙을 다시 검사한다. */
export async function toggleUnconfirmed(name: string, date: string): Promise<ToggleResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  try {
    const result = await toggle(String(name), String(date), todayInSeoul(), await isHolidayDate(String(date)));
    if (result.ok) {
      revalidatePath("/");
      revalidatePath("/admin");
    }
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "미확인 표시를 바꾸지 못했습니다." };
  }
}

export type MorningResult = { ok: true; state: MorningState } | { ok: false; error: string };

/**
 * 리모트로 보이는 칸(계획된 리모트 또는 리모트 기록)의 아침 확인을 리모트 → 출근 → 미확인 → 리모트로 한 단계 넘긴다.
 * 근태 기록은 바꾸지 않는다. 서버에서 규칙을 다시 검사한다.
 */
export async function toggleMorningConfirmation(name: string, date: string): Promise<MorningResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  try {
    const cellName = String(name);
    const cellDate = String(date);
    const [records, plan, confirmations, isHoliday] = await Promise.all([
      getRecords({ from: cellDate, to: cellDate }),
      loadPlan([cellDate]),
      getConfirmations({ from: cellDate, to: cellDate }),
      isHolidayDate(cellDate),
    ]);
    const record = records.find((entry) => entry.name === cellName);
    const isRemoteCell = record ? record.type === "리모트" : plan.planned.includes(`${cellName}|${cellDate}`);
    const check = checkCanConfirmRemote({ date: cellDate, today: todayInSeoul(), isHoliday, isRemoteCell });
    if (!check.ok) return { ok: false, error: check.reason };

    const current = confirmations.find((entry) => entry.name === cellName)?.result ?? "remote";
    const state = nextMorningState(current);
    const saved = await setConfirmation(cellName, cellDate, state === "remote" ? null : state);
    if (!saved.ok) return saved;
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/mail");
    return { ok: true, state };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "아침 확인을 바꾸지 못했습니다." };
  }
}

export type EditCellResult = { ok: true } | { ok: false; error: string };

/**
 * 현황표 팝업에서 고른 근태 유형(또는 기록 지우기)을 그 칸에 저장한다. 수정 시각이 수신 시각이 된다.
 * 근무일의 재직 중인 팀원 칸만 고칠 수 있고, 서버에서 규칙을 다시 검사한다.
 */
export async function editAttendanceCell(name: string, date: string, choice: CellChoice): Promise<EditCellResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  if (typeof name !== "string" || typeof date !== "string") return { ok: false, error: "요청이 올바르지 않습니다." };
  try {
    const [members, isHoliday] = await Promise.all([getMembers(), isHolidayDate(date)]);
    const member = members.find((candidate) => candidate.name === name);
    const check = checkCellEdit({ date, isHoliday, isMember: !!member && isActiveOn(member, date), choice });
    if (!check.ok) return check;
    const saved = await editCell(name, date, choice, new Date().toISOString());
    if (!saved.ok) return saved;
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/mail");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "근태를 바꾸지 못했습니다." };
  }
}
