import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { PageShell } from "@/components/page-shell";
import { login } from "@/lib/admin/actions";
import { isAdmin } from "@/lib/admin/auth";
import { safeNextPath } from "@/lib/admin/password";

export const metadata = { title: "관리자 로그인 · 근태 현황판" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; changed?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  if (await isAdmin()) redirect(next);

  return (
    <PageShell title="관리자 로그인">
      <LoginForm
        action={login}
        next={next}
        notice={params.changed === undefined ? undefined : "비밀번호를 바꿨습니다. 새 비밀번호로 다시 로그인해 주세요."}
      />
    </PageShell>
  );
}
