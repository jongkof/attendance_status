import { AdminNav } from "@/components/admin-nav";
import { PageShell } from "@/components/page-shell";
import { PasswordForm } from "@/components/password-form";
import { TeamPasswordForm } from "@/components/team-password-form";
import { changePassword } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { changeTeamPassword } from "@/lib/team/actions";
import { getTeamCredential } from "@/lib/team/credential";

export const metadata = { title: "비밀번호 변경 · 근태 현황판" };

async function teamPasswordStatus(): Promise<string> {
  try {
    const credential = await getTeamCredential();
    if (!credential) return "팀 비밀번호가 설정되어 있지 않습니다.";
    return credential.kind === "stored" ? "팀 비밀번호는 화면에서 바꾼 값을 쓰고 있습니다." : "팀 비밀번호는 서버 설정의 처음 값을 쓰고 있습니다.";
  } catch {
    return "팀 비밀번호 설정을 확인하지 못했습니다.";
  }
}

export default async function PasswordPage() {
  await requireAdmin("/admin/password");
  const status = await teamPasswordStatus();
  return (
    <PageShell title="비밀번호 변경" description="관리자 비밀번호와 팀 비밀번호를 바꿉니다." actions={<AdminNav />}>
      <div className="flex flex-wrap items-start gap-6">
        <PasswordForm action={changePassword} minLength={MIN_PASSWORD_LENGTH} />
        <TeamPasswordForm action={changeTeamPassword} minLength={MIN_PASSWORD_LENGTH} status={status} />
      </div>
    </PageShell>
  );
}
