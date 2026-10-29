import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase/server";

import { hashPassword, verifyPassword } from "./password";

/** 지금 유효한 관리자 비밀번호. 화면에서 바꾼 값이 있으면 그것이, 없으면 환경 변수의 처음 비밀번호가 쓰인다. */
export type Credential = { kind: "stored"; hash: string } | { kind: "env"; password: string };

/**
 * 읽기에 실패하면 예외를 던진다. 실패했을 때 환경 변수 비밀번호로 되돌아가면,
 * 이미 바꾼 비밀번호 대신 처음 비밀번호가 통하게 되기 때문이다.
 */
export async function getCredential(): Promise<Credential | null> {
  const { data, error } = await supabaseAdmin()
    .from("admin_credentials")
    .select("password_hash")
    .eq("id", true)
    .maybeSingle<{ password_hash: string }>();
  if (error) throw new Error(`관리자 비밀번호를 읽지 못했습니다: ${error.message}`);
  if (data) return { kind: "stored", hash: data.password_hash };

  const password = process.env.ADMIN_PASSWORD;
  return password ? { kind: "env", password } : null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export async function checkPassword(password: string, credential: Credential): Promise<boolean> {
  if (password === "") return false;
  if (credential.kind === "stored") return verifyPassword(password, credential.hash);
  return timingSafeEqual(digest(password), digest(credential.password));
}

/** 로그인 토큰 서명에 쓰는 키. 비밀번호가 바뀌면 달라져서 이전 로그인이 모두 무효가 된다. */
export function sessionSecret(credential: Credential): string {
  const material = credential.kind === "stored" ? `stored:${credential.hash}` : `env:${credential.password}`;
  return createHash("sha256").update(`admin-session:${material}`).digest("hex");
}

export async function saveStoredPassword(password: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("admin_credentials")
    .upsert({ id: true, password_hash: await hashPassword(password), updated_at: new Date().toISOString() });
  if (error) throw new Error(`비밀번호를 저장하지 못했습니다: ${error.message}`);
}
