import "server-only";

import { createClient } from "@supabase/supabase-js";

/** 서버 전용 Supabase 클라이언트(secret key). 브라우저 코드에서는 절대 쓰지 않는다. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)가 설정되지 않았습니다.");
  }
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
