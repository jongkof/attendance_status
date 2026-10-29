-- 관리자 비밀번호: 화면에서 바꾼 비밀번호의 암호화한 값(해시)만 저장한다. 원문은 저장하지 않는다.
-- 이 표에 행이 없으면 서버 환경 변수 ADMIN_PASSWORD로 로그인한다.
-- 비밀번호를 잊었을 때는 이 표의 행을 지우면 환경 변수의 처음 비밀번호로 돌아간다.
-- 앱은 서버에서만 secret key로 접근하므로 RLS를 켜고 정책은 두지 않는다.

create table public.admin_credentials (
  id boolean primary key default true check (id),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_credentials enable row level security;

revoke all on table public.admin_credentials from anon, authenticated;
