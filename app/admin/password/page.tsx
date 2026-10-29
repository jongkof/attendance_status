import { AdminNav } from "@/components/admin-nav";
import { PageShell } from "@/components/page-shell";
import { PasswordForm } from "@/components/password-form";
import { changePassword } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/admin/password";

export const metadata = { title: "비밀번호 변경 · 근태 현황판" };

export default async function PasswordPage() {
  await requireAdmin("/admin/password");
  return (
    <PageShell title="비밀번호 변경" description="관리자 비밀번호를 바꿉니다." actions={<AdminNav />}>
      <PasswordForm action={changePassword} minLength={MIN_PASSWORD_LENGTH} />
    </PageShell>
  );
}
