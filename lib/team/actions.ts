"use server";

import { redirect } from "next/navigation";

import { endSession, isAdmin } from "@/lib/admin/auth";
import { checkPassword, getCredential } from "@/lib/admin/credential";
import { MIN_PASSWORD_LENGTH } from "@/lib/admin/password";

import { endTeamSession, startTeamSession } from "./auth";
import { checkTeamPassword, getTeamCredential, saveTeamPassword } from "./credential";
import { checkNewTeamPassword, safeTeamNextPath } from "./session";

export type TeamFormState = { error?: string; done?: boolean } | undefined;

const WRONG_PASSWORD_DELAY_MS = 1000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 팀 비밀번호로 로그인한다. 성공하면 요청했던 현황표로 이동한다. */
export async function teamLogin(_state: TeamFormState, formData: FormData): Promise<TeamFormState> {
  const password = String(formData.get("password") ?? "");
  const next = safeTeamNextPath(String(formData.get("next") ?? ""));

  let accepted = false;
  try {
    const credential = await getTeamCredential();
    if (!credential) {
      return { error: "팀 비밀번호가 설정되어 있지 않습니다. 서버에 TEAM_PASSWORD를 설정해 주세요." };
    }
    accepted = await checkTeamPassword(password, credential);
    if (accepted) await startTeamSession(credential);
  } catch {
    return { error: "로그인을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }

  if (!accepted) {
    await wait(WRONG_PASSWORD_DELAY_MS);
    return { error: "비밀번호가 맞지 않습니다." };
  }
  redirect(next);
}

/** 현황표에서 로그아웃한다. 관리자로도 로그인해 있었다면 함께 로그아웃한다. */
export async function teamLogout(): Promise<void> {
  await endTeamSession();
  await endSession();
  redirect("/login");
}

/** 팀 비밀번호를 바꾼다. 팀원의 로그인은 모두 풀리고, 바꾼 관리자의 로그인은 그대로다. */
export async function changeTeamPassword(_state: TeamFormState, formData: FormData): Promise<TeamFormState> {
  if (!(await isAdmin())) return { error: "로그인이 필요합니다." };

  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  try {
    const adminCredential = await getCredential();
    const sameAsAdmin = adminCredential !== null && (await checkPassword(next, adminCredential));
    const problem = checkNewTeamPassword({ next, confirm, minLength: MIN_PASSWORD_LENGTH, sameAsAdmin });
    if (problem) return { error: problem };

    await saveTeamPassword(next);
  } catch {
    return { error: "팀 비밀번호를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  return { done: true };
}
