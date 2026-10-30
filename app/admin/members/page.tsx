import { CircleAlertIcon } from "lucide-react";

import { AdminNav } from "@/components/admin-nav";
import { MemberManager } from "@/components/member-manager";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { requireAdmin } from "@/lib/admin/auth";
import { todayInSeoul } from "@/lib/attendance";
import { getMembers } from "@/lib/roster/store";

import { addTeamMember, removeTeamMember, renameTeamMember, restoreTeamMember } from "./actions";

export const metadata = { title: "팀원 명단 · 근태 현황판" };

export default async function MembersPage() {
  await requireAdmin("/admin/members");
  const today = todayInSeoul();

  let members: Awaited<ReturnType<typeof getMembers>> | null = null;
  let failure: string | null = null;
  try {
    members = await getMembers();
  } catch (error) {
    failure = error instanceof Error ? error.message : "잠시 뒤 다시 시도해 주세요.";
  }

  return (
    <PageShell
      title="팀원 명단"
      description="팀원을 추가하고 이름을 고치고, 팀을 떠난 팀원을 제거합니다. 제거는 삭제가 아니라서 과거 현황표에는 그대로 남고, 제거일부터의 현황표와 집계, 현황 메일에서만 빠집니다."
      actions={<AdminNav />}
    >
      {members === null ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>팀원 명단을 불러오지 못했습니다</AlertTitle>
          <AlertDescription>
            {failure} 처음 쓰는 경우 Supabase SQL Editor에서 supabase/migrations/20261031020000_member_tenure.sql을 실행했는지 확인해 주세요.
          </AlertDescription>
        </Alert>
      ) : (
        <MemberManager
          members={members}
          today={today}
          actions={{ add: addTeamMember, rename: renameTeamMember, remove: removeTeamMember, restore: restoreTeamMember }}
        />
      )}
    </PageShell>
  );
}
