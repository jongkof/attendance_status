import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCredential, sessionSecret, type Credential } from "./credential";
import { createSessionToken, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "./session";

const COOKIE = "admin_session";
const COOKIE_PATH = "/admin";

/** 지금 요청이 로그인한 관리자의 것인지. 읽기에 실패하면 로그인하지 않은 것으로 다룬다. */
export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const credential = await getCredential();
    return credential !== null && verifySessionToken(token, sessionSecret(credential));
  } catch {
    return false;
  }
}

/** 관리 화면에서 부른다. 로그인하지 않았으면 로그인 화면으로 보내고, 로그인하면 path로 돌아온다. */
export async function requireAdmin(path: string): Promise<void> {
  if (!(await isAdmin())) redirect(`/admin/login?next=${encodeURIComponent(path)}`);
}

export async function startSession(credential: Credential): Promise<void> {
  (await cookies()).set(COOKIE, createSessionToken(sessionSecret(credential)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: COOKIE_PATH });
}
