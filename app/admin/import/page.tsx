import Link from "next/link";

import { ImportPanel } from "@/components/import-panel";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";

import { applyImport, previewImport } from "./actions";

export const metadata = { title: "근태 JSON 반영 · 근태 현황판" };

export default function ImportPage() {
  return (
    <PageShell
      title="근태 JSON 반영"
      description="Copilot이 정리한 근태 JSON을 붙여 넣고, 바뀌는 내용을 확인한 뒤 반영합니다."
      actions={
        <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
          관리자 현황표
        </Link>
      }
    >
      <ImportPanel preview={previewImport} apply={applyImport} />
    </PageShell>
  );
}
