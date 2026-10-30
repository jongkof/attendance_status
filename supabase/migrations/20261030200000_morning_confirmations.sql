-- 아침 확인 결과: 리모트로 보이는 칸(계획된 리모트, 공지로 들어온 리모트 기록)을 관리자가
-- 출근 또는 미확인(?)으로 확인한 결과. 근태 기록은 바꾸지 않고 표시와 집계만 바꾼다.
-- 행이 없으면 리모트 그대로다. 근태 JSON이 반영되어도 이 표는 건드리지 않는다.
-- 앱은 서버에서만 secret key로 접근하므로 RLS를 켜고 정책은 두지 않는다.

create table public.morning_confirmations (
  member_id bigint not null references public.members (id),
  work_date date not null,
  result text not null check (result in ('present', 'unconfirmed')),
  confirmed_at timestamptz not null default now(),
  primary key (member_id, work_date)
);

create index morning_confirmations_work_date_idx on public.morning_confirmations (work_date);

alter table public.morning_confirmations enable row level security;

revoke all on table public.morning_confirmations from anon, authenticated;
