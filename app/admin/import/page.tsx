import { AdminNav } from "@/components/admin-nav";
import { ImportPanel } from "@/components/import-panel";
import { PageShell } from "@/components/page-shell";
import { PromptPanel } from "@/components/prompt-panel";
import { requireAdmin } from "@/lib/admin/auth";
import { todayInSeoul } from "@/lib/attendance";
import { activeNamesOn } from "@/lib/roster";
import { getMembers } from "@/lib/roster/store";

import { applyImport, previewImport } from "./actions";

export const metadata = { title: "근태 JSON 반영 · 근태 현황판" };

export default async function ImportPage() {
  await requireAdmin("/admin/import");
  // 프롬프트의 명단은 오늘 재직 중인 팀원이다. 제거한 팀원과 아직 시작일이 오지 않은 팀원은 빠진다.
  const today = todayInSeoul();
  const names = activeNamesOn(await getMembers(), today);
  return (
    <PageShell
      title="근태 JSON 반영"
      description="Copilot 프롬프트로 정리한 근태 JSON을 붙여 넣고, 바뀌는 내용을 확인한 뒤 반영합니다."
      actions={<AdminNav />}
    >
      <PromptPanel today={today} names={names} />
      <ImportPanel preview={previewImport} apply={applyImport} />
    </PageShell>
  );
}
