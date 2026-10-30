-- 리모트 직접 수정과 리모트 없는 주 지정.
-- 앱은 서버에서만 secret key로 접근하므로 RLS를 켜고 정책은 두지 않는다.

-- 사람·날짜별 직접 수정. kind가 'add'면 규칙에 없던 리모트를 넣은 것이고, 'remove'면 규칙이 정한 리모트를 뺀 것이다.
-- 규칙을 다시 적용해도 지워지지 않는다.
create table public.remote_cell_edits (
  member_id bigint not null references public.members (id) on delete cascade,
  work_date date not null,
  kind text not null check (kind in ('add', 'remove')),
  primary key (member_id, work_date)
);

-- 주별 리모트 없음 지정. week는 그 주의 월요일이고, skip이 true면 리모트 없는 주, false면 휴일·행사 주를 관리자가 푼 것이다.
-- 행이 없으면 휴일·행사 유무로 자동 판정한다.
create table public.remote_week_overrides (
  week date primary key check (extract(isodow from week) = 1),
  skip boolean not null
);

alter table public.remote_cell_edits enable row level security;
alter table public.remote_week_overrides enable row level security;

revoke all on table public.remote_cell_edits, public.remote_week_overrides from anon, authenticated;
