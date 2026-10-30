import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { PageShell } from "@/components/page-shell";
import { canViewBoard } from "@/lib/team/auth";
import { teamLogin } from "@/lib/team/actions";
import { safeTeamNextPath } from "@/lib/team/session";

export const metadata = { title: "팀 로그인 · 근태 현황판" };

export default async function TeamLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeTeamNextPath(typeof params.next === "string" ? params.next : undefined);
  if (await canViewBoard()) redirect(next);

  return (
    <PageShell title="팀 로그인">
      <LoginForm
        action={teamLogin}
        next={next}
        title="팀 로그인"
        description="팀원만 볼 수 있는 현황표입니다. 팀 비밀번호를 입력해 주세요."
      />
    </PageShell>
  );
}
