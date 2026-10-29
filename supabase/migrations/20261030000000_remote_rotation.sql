-- 리모트 로테이션: 리모트 조 편성과 순환 규칙.
-- 앱은 서버에서만 secret key로 접근하므로 RLS를 켜고 정책은 두지 않는다.

-- 리모트 조. 조를 지우면 그 팀원은 미배정(remote_group_id = null)이 된다.
create table public.remote_groups (
  id bigint generated always as identity primary key,
  name text not null check (length(btrim(name)) > 0),
  sort_order integer not null
);

alter table public.members
  add column remote_group_id bigint references public.remote_groups (id) on delete set null;

-- 순환 규칙. from_week는 기준 주의 월요일이고, 규칙은 그 주부터 다음 규칙 직전까지 적용된다.
-- order_steps는 모든 조가 공유하는 요일 순서('월'…'금', '리모트 없음')이고,
-- starts는 조 번호(문자열)별 기준 주의 시작 단계(order_steps 안의 0부터 센 위치)다.
create table public.remote_rules (
  from_week date primary key check (extract(isodow from from_week) = 1),
  order_steps text[] not null check (cardinality(order_steps) > 0),
  starts jsonb not null default '{}'::jsonb
);

alter table public.remote_groups enable row level security;
alter table public.remote_rules enable row level security;

revoke all on table public.remote_groups, public.remote_rules from anon, authenticated;

-- 규칙을 적용한다. 기준 주 이후에 있던 이전 규칙은 지우고 새 규칙을 넣는 일이 한 트랜잭션에서 끝난다.
create function public.apply_remote_rule(p_from_week date, p_order_steps text[], p_starts jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.remote_rules where from_week >= p_from_week;
  insert into public.remote_rules (from_week, order_steps, starts) values (p_from_week, p_order_steps, p_starts);
end;
$$;

revoke execute on function public.apply_remote_rule(date, text[], jsonb) from public, anon, authenticated;
grant execute on function public.apply_remote_rule(date, text[], jsonb) to service_role;
