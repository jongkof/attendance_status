import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { PageShell } from "@/components/page-shell";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata = { title: "사용 안내 · 근태 현황판" };

type Section = {
  id: string;
  title: string;
  when: string;
  where: { label: string; href: string }[];
  steps: React.ReactNode[];
  check: React.ReactNode[];
};

const FENCE = "```";

const SECTIONS: Section[] = [
  {
    id: "daily",
    title: "1. 하루 일과",
    when: "평일 아침마다, 공지 메일을 정리해 현황을 반영하고 팀에 현황 메일을 보낼 때.",
    where: [
      { label: "근태 JSON 반영", href: "/admin/import" },
      { label: "관리자 현황표", href: "/admin" },
      { label: "현황 메일", href: "/admin/mail" },
    ],
    steps: [
      <>
        <b>근태 JSON 반영</b> 화면의 “Copilot 프롬프트”에서 정리할 메일의 수신 기간(시작일, 종료일)을 고르고 <b>복사</b>를 누릅니다.
        월요일 아침이라면 시작일을 주말 앞으로 당기세요.
      </>,
      <>Copilot에 프롬프트를 붙여 넣고, 근태 공지 메일을 정리한 JSON을 받습니다.</>,
      <>
        받은 JSON 전체를 “근태 JSON 붙여 넣기”의 입력칸에 붙여 넣고 <b>미리보기</b>를 누릅니다. 이 단계에서는 아무것도 저장되지 않습니다.
      </>,
      <>
        미리보기에서 세 가지를 확인합니다. ① 바뀌는 칸(새로 생김, 바뀜, 건너뜀, 변화 없음) ② “반영 제외”에 나온, 팀원 명단에 없는
        이름 ③ “확인 필요”로 표시된 줄. 내용이 맞으면 <b>반영하기</b>를 누릅니다.
      </>,
      <>
        아침에 실제 출근을 확인합니다. <b>관리자 현황표</b>에서 오늘 열의 리모트 대상자(노란 칸)와 미확인으로 바꿀 칸을 봅니다. 공지도
        연락도 없이 자리에 없는 사람의 칸(녹색 칸)을 누르면 미확인(?)이 되고, 다시 누르면 출근으로 돌아옵니다. 리모트로 보이는 칸은
        누를 때마다 리모트 → 출근 → 미확인(?) → 리모트로 바뀝니다.
      </>,
      <>
        <b>현황 메일</b> 화면에서 날짜를 확인하고(기본은 오늘, <b>오늘로</b> 버튼으로 돌아옵니다) 본문 미리보기를 봅니다. <b>제목 복사</b>와{" "}
        <b>본문 복사</b>를 차례로 눌러 Outlook의 제목과 본문에 붙여 넣고 발송합니다. 서식이 본문에 그대로 붙는 것으로 가정하고 있으니,
        붙인 모양이 다르면 발송 전에 확인하세요.
      </>,
    ],
    check: [
      <>반영 뒤 “반영했습니다” 안내에 새로 생긴 칸, 바뀐 칸, 건너뛴 칸의 개수가 나옵니다.</>,
      <>현황표에서 반영한 날짜의 칸이 공지대로 바뀌었는지 봅니다.</>,
      <>
        메일 본문에서 고칠 내용이 보이면 메일 화면이 아니라 근태 기록(JSON 반영 또는 현황표 수정)을 고친 뒤 메일 화면에서 다시 봅니다.
      </>,
    ],
  },
  {
    id: "monthly",
    title: "2. 월별 관리",
    when: "달 말에 다음 달 준비를 할 때, 그리고 면담이 정해질 때.",
    where: [
      { label: "리모트 관리", href: "/admin/remote" },
      { label: "휴일·행사", href: "/admin/calendar" },
      { label: "면담", href: "/admin/interviews" },
    ],
    steps: [
      <>
        <b>리모트 관리</b>에서 월 이동으로 다음 달을 엽니다. “조 편성”으로 팀원을 조에 넣고(팀원을 누른 뒤 옮길 조의 “여기로 옮기기”),
        “순환 규칙”에서 요일 순서, 기준 주, 조별 시작 요일을 정한 뒤 <b>적용…</b>과 <b>확인하고 적용</b>을 누릅니다. 적용 전에는 아래
        리모트 표에 미리 보기만 보이며, 기준 주 이전 주는 기존 규칙이 유지됩니다.
      </>,
      <>
        “리모트 표”에서 주별 <b>리모트 없음</b>을 체크하면 그 주는 순환을 소모하지 않고 건너뜁니다. 휴일이나 행사가 있는 주는 처음부터
        체크되어 있습니다. 이 체크와 칸 직접 수정은 “적용” 없이 바로 저장됩니다.
      </>,
      <>
        한 사람의 한 날짜만 고치려면 리모트 표의 칸을 누르거나, <b>관리자 현황표</b>에서 <b>수정 모드</b>를 켜고 칸을 눌러 수정 창에서
        근태 유형, 리모트 계획, 면담 표시를 바꿉니다. 수정 모드에서는 출근 ↔ 미확인과 리모트 3단계 토글이 꺼지니, 끝나면{" "}
        <b>수정 모드 끄기</b>를 누르세요.
      </>,
      <>
        <b>휴일·행사</b>에서 해당 연도를 열고 날짜, 종류(휴일 또는 행사), 이름을 입력해 <b>추가</b>합니다. 하루에 하나씩만 등록되고,
        규칙 표시가 있는 회사 휴일은 날짜가 자동으로 정해져 고칠 수 없습니다.
      </>,
      <>
        <b>면담</b>에서 달을 고르고 사람과 날짜의 칸을 누르면 면담이 켜지고, 다시 누르면 꺼집니다. 켜진 칸은 현황표에 플래그로 보이고
        그날 현황 메일의 “오늘 면담”에 나갑니다.
      </>,
    ],
    check: [
      <>리모트 표와 관리자 현황표에서 다음 달 노란 칸이 의도한 조와 요일에 있는지 봅니다.</>,
      <>휴일이 현황표에서 회색 칸으로 가려지는지 봅니다.</>,
      <>
        리모트 표와 면담 표는 <b>이미지로 복사</b>나 <b>이미지 저장</b>으로 그림 파일로 만들어 메일에 붙일 수 있습니다.
      </>,
    ],
  },
  {
    id: "yearly",
    title: "3. 연간 관리",
    when: "새해가 다가올 때(11월부터 화면 위쪽에 안내가 나옵니다). 정부 공휴일은 해마다 등록해야 합니다.",
    where: [{ label: "휴일·행사", href: "/admin/calendar" }],
    steps: [
      <>
        화면 위쪽에 “내년 공휴일이 아직 등록되지 않았습니다” 같은 안내가 나오면 <b>등록 방법 보기</b>를 눌러 방법을 확인합니다. 2028–2030년
        공휴일은 이미 들어 있으니, 그 이후 연도부터 등록하면 됩니다.
      </>,
      <>
        <b>휴일·행사</b>에서 새 연도를 고르고, 종류를 “휴일”로 해 공휴일을 하나씩 추가합니다(연도 하나에 20건 안팎, 설날·추석은 앞뒤 날까지
        4일). 한꺼번에 넣고 싶다면 개발 담당자에게 SQL 파일을 받아 실행하는 방법이 있습니다.
      </>,
    ],
    check: [<>등록 뒤 화면을 새로 고쳐 안내가 사라졌는지, 현황표에서 휴일 칸이 회색으로 보이는지 확인합니다.</>],
  },
  {
    id: "members",
    title: "4. 명단 관리",
    when: "팀원이 들어오거나, 이름을 바로잡거나, 팀을 떠날 때.",
    where: [
      { label: "팀원 명단", href: "/admin/members" },
      { label: "리모트 관리", href: "/admin/remote" },
    ],
    steps: [
      <>
        <b>팀원 명단</b>의 “팀원 추가”에 이름과 시작일을 넣고 <b>추가</b>를 누릅니다. 새 팀원은 리모트 조가 미배정으로 시작하므로{" "}
        <b>리모트 관리</b>의 조 편성에서 조를 배정하세요.
      </>,
      <>
        이름을 고칠 때는 이름 칸을 고치고 <b>이름 수정</b>을 누릅니다. Copilot 프롬프트의 명단이 같이 바뀌므로, 수정한 뒤에는 프롬프트를 새로
        복사해 쓰세요.
      </>,
      <>
        팀을 떠난 팀원은 제거일을 정해 <b>제거</b>를 누릅니다. 삭제가 아니라서 과거 현황표에는 그대로 남고, 제거일부터의 현황표와 집계, 현황
        메일에서만 빠집니다. 잘못 제거했다면 “제거된 팀원”에서 <b>제거 취소</b>를 누릅니다.
      </>,
    ],
    check: [<>팀원 수가 현황표와 맞는지, 명단에 없는 이름 때문에 “반영 제외”가 나오지 않는지 봅니다.</>],
  },
  {
    id: "passwords",
    title: "5. 비밀번호",
    when: "비밀번호를 바꿔야 하거나, 잊었을 때.",
    where: [{ label: "비밀번호 변경", href: "/admin/password" }],
    steps: [
      <>
        비밀번호는 두 가지입니다. <b>관리자 비밀번호</b>는 이 관리자 화면 전체를 잠그고, <b>팀 비밀번호</b>는 팀원이 보는 현황표를 잠급니다.
        팀 비밀번호로는 관리자 화면에 들어올 수 없고, 관리자로 로그인하면 현황표도 볼 수 있습니다.
      </>,
      <>
        <b>비밀번호 변경</b> 화면에서 관리자 비밀번호(현재 비밀번호, 새 비밀번호, 확인)나 팀 비밀번호(새 비밀번호, 확인)를 바꿉니다. 관리자
        비밀번호를 바꾸면 로그인한 모든 곳에서 로그아웃되고, 팀 비밀번호를 바꾸면 팀원이 모두 로그아웃됩니다(관리자 로그인은 유지). 팀에는 새
        비밀번호를 따로 알려 주세요.
      </>,
      <>
        잊었을 때는 이메일 복구가 없습니다. 개발 담당자가 데이터베이스에 저장된 비밀번호 한 줄을 지우면 서버 설정의 처음 비밀번호로 되돌아갑니다.
        처음 비밀번호는 개발 담당자에게 물어보세요.
      </>,
    ],
    check: [<>바꾼 뒤 새 비밀번호로 로그인되는지 봅니다. 비밀번호는 안전한 곳에 따로 적어 두세요.</>],
  },
  {
    id: "trouble",
    title: "6. 자주 겪는 문제",
    when: "화면에서 막혔을 때.",
    where: [
      { label: "근태 JSON 반영", href: "/admin/import" },
      { label: "현황 메일", href: "/admin/mail" },
      { label: "관리자 현황표", href: "/admin" },
    ],
    steps: [
      <>
        <b>“JSON으로 읽을 수 없습니다”가 나올 때</b>: Copilot이 JSON을 코드블록({FENCE})으로 감쌌다면 앞뒤의 {FENCE} 줄을 지우고{" "}
        <code>{"{"}</code>로 시작해 <code>{"}"}</code>로 끝나게 붙여 넣으세요. 중간에 잘려 붙었다면 Copilot의 답을 처음부터 끝까지 다시
        복사합니다. “records 배열이 없습니다”도 같은 원인입니다.
      </>,
      <>
        <b>명단에 없는 이름이 나올 때</b>: 미리보기의 “반영 제외”에 이름이 나오고 그 줄은 반영되지 않습니다. <b>팀원 명단</b>에 이름이 등록돼
        있는지, Copilot이 다른 표기를 썼는지 확인하세요. 이름을 추가하거나 고친 뒤 JSON의 이름을 맞춰 다시 미리보기를 누릅니다.
      </>,
      <>
        <b>“더 최근 기록이 있어 건너뜀”이 나올 때</b>: 같은 사람·같은 날짜는 메일 수신 시각이 가장 늦은 공지가 유효합니다. 이미 저장된 기록이 더
        늦게 받은 공지라는 뜻이라 오류가 아닙니다. 그래도 바꾸려면 현황표의 수정 모드로 직접 고치세요.
      </>,
      <>
        <b>메일 링크가 로그인 화면으로 갈 때</b>: 현황 메일의 링크는 팀 비밀번호(또는 관리자 로그인)를 거쳐 열립니다. 메일에 접근 토큰을 싣지
        않기 때문이며, 팀원에게 팀 비밀번호를 알려 주면 됩니다.
      </>,
      <>
        <b>수정 모드에서 칸이 바뀌지 않을 때</b>: 칸을 누르면 바로 바뀌지 않고 수정 창이 열립니다. 창에서 유형을 고르거나 계획·면담 버튼을
        눌러야 저장되고, 휴일이나 재직 기간이 아닌 칸은 고칠 수 없습니다. 반대로 수정 모드가 켜져 있으면 출근 ↔ 미확인 토글이 꺼져 있으니{" "}
        <b>수정 모드 끄기</b>를 눌러 돌아가세요.
      </>,
    ],
    check: [<>그래도 해결되지 않으면 화면의 오류 문구를 그대로 적어 개발 담당자에게 전달하세요.</>],
  },
];

export default async function GuidePage() {
  await requireAdmin("/admin/guide");
  return (
    <PageShell
      title="사용 안내"
      description="근태 관리자를 위한 안내입니다. 각 절은 언제, 어느 메뉴에서, 어떤 순서로 하는지, 끝나고 무엇을 확인하는지 순서로 적었습니다."
      actions={<AdminNav />}
    >
      <nav aria-label="목차" className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-semibold">목차</p>
        <ul className="flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="underline-offset-4 hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex max-w-3xl flex-col gap-10 break-words">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="flex scroll-mt-6 flex-col gap-3">
            <h2 id={`${section.id}-title`} className="font-heading text-xl font-semibold">
              {section.title}
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="font-semibold">언제 하나요</dt>
                <dd className="text-muted-foreground">{section.when}</dd>
              </div>
              <div>
                <dt className="font-semibold">어느 메뉴에서 하나요</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-1">
                  {section.where.map((menu) => (
                    <Link key={menu.href} href={menu.href} className="underline underline-offset-4">
                      {menu.label}
                    </Link>
                  ))}
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-1 text-sm font-semibold">단계</h3>
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
                {section.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold">확인할 것</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed">
                {section.check.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
