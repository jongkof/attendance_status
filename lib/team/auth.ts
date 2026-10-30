import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin/auth";
import { createSessionToken, verifySessionToken } from "@/lib/admin/session";

import { getTeamCredential, teamSessionSecret, type TeamCredential } from "./credential";
import { TEAM_SESSION_MAX_AGE_SECONDS } from "./session";

const COOKIE = "team_session";

/** 지금 요청이 팀 로그인한 사람의 것인지. 읽기에 실패하면 로그인하지 않은 것으로 다룬다. */
export async function isTeamMember(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const credential = await getTeamCredential();
    return credential !== null && verifySessionToken(token, teamSessionSecret(credential));
  } catch {
    return false;
  }
}

/** 현황표를 볼 수 있는 요청인지: 팀 로그인 또는 관리자 로그인. 현황 데이터를 읽는 곳마다 부른다. */
export async function canViewBoard(): Promise<boolean> {
  return (await isTeamMember()) || (await isAdmin());
}

/** 현황표에서 부른다. 볼 수 없으면 팀 로그인 화면으로 보내고, 로그인하면 path로 돌아온다. */
export async function requireViewer(path: string): Promise<void> {
  if (!(await canViewBoard())) redirect(`/login?next=${encodeURIComponent(path)}`);
}

export async function startTeamSession(credential: TeamCredential): Promise<void> {
  (await cookies()).set(
    COOKIE,
    createSessionToken(teamSessionSecret(credential), new Date(), TEAM_SESSION_MAX_AGE_SECONDS),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TEAM_SESSION_MAX_AGE_SECONDS,
    },
  );
}

export async function endTeamSession(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/" });
}
