"use server";

import { redirect } from "next/navigation";

import { endSession, isAdmin, startSession } from "./auth";
import { checkPassword, getCredential, saveStoredPassword } from "./credential";
import { checkNewPassword, safeNextPath } from "./password";

export type FormState = { error?: string } | undefined;

const WRONG_PASSWORD_DELAY_MS = 1000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 비밀번호로 로그인한다. 성공하면 요청했던 관리 화면으로 이동한다. */
export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  let accepted = false;
  try {
    const credential = await getCredential();
    if (!credential) {
      return { error: "관리자 비밀번호가 설정되어 있지 않습니다. 서버에 ADMIN_PASSWORD를 설정해 주세요." };
    }
    accepted = await checkPassword(password, credential);
    if (accepted) await startSession(credential);
  } catch {
    return { error: "로그인을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }

  if (!accepted) {
    await wait(WRONG_PASSWORD_DELAY_MS);
    return { error: "비밀번호가 맞지 않습니다." };
  }
  redirect(next);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

/** 비밀번호를 바꾼다. 성공하면 모든 로그인이 풀리고 로그인 화면으로 이동한다. */
export async function changePassword(_state: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "로그인이 필요합니다." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  try {
    const credential = await getCredential();
    if (!credential || !(await checkPassword(current, credential))) {
      await wait(WRONG_PASSWORD_DELAY_MS);
      return { error: "현재 비밀번호가 맞지 않습니다." };
    }
    const problem = checkNewPassword({ current, next, confirm });
    if (problem) return { error: problem };

    await saveStoredPassword(next);
    await endSession();
  } catch {
    return { error: "비밀번호를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  redirect("/admin/login?changed=1");
}
