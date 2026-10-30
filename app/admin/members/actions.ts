"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/admin/auth";
import { addMember, renameMember, setRemovedOn, type WriteResult } from "@/lib/roster/store";

const LOGIN_REQUIRED = "로그인이 필요합니다. 관리자 로그인 후 다시 시도해 주세요.";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  revalidatePath("/admin/remote");
  revalidatePath("/admin/mail");
}

async function write(run: () => Promise<WriteResult>): Promise<WriteResult> {
  const result = await run();
  if (result.ok) refresh();
  return result;
}

/** 팀원을 추가한다. 조는 미배정이고 표시 순서는 맨 끝이다. */
export async function addTeamMember(name: string, start: string): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  return write(() => addMember(name, start));
}

/** 이름을 고친다. 다른 팀원(제거한 팀원 포함)과 같은 이름이면 거절한다. */
export async function renameTeamMember(id: number, name: string): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  return write(() => renameMember(id, name));
}

/** 제거일부터 현황에서 뺀다. 삭제가 아니라 기록이 남는다. */
export async function removeTeamMember(id: number, removedOn: string): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  return write(() => setRemovedOn(id, removedOn));
}

/** 제거일을 지워 다시 재직 중으로 되돌린다. */
export async function restoreTeamMember(id: number): Promise<WriteResult> {
  if (!(await isAdmin())) return { ok: false, error: LOGIN_REQUIRED };
  return write(() => setRemovedOn(id, null));
}
