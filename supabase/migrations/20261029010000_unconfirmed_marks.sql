-- 미확인(?) 표시: 일정이 없는 칸을 관리자가 아침 확인 때 표시한다.
-- 앱은 서버에서만 secret key로 접근하므로 RLS를 켜고 정책은 두지 않는다.

create table public.unconfirmed_marks (
  member_id bigint not null references public.members (id),
  work_date date not null,
  marked_at timestamptz not null default now(),
  primary key (member_id, work_date)
);

create index unconfirmed_marks_work_date_idx on public.unconfirmed_marks (work_date);

alter table public.unconfirmed_marks enable row level security;

revoke all on table public.unconfirmed_marks from anon, authenticated;

-- 미확인을 켜고 끈다. 켜면 true, 끄면 false를 돌려준다.
-- 근태 기록이 이미 있는 칸에는 켜지지 않는다(그때는 false).
create function public.toggle_unconfirmed(p_member_id bigint, p_work_date date)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  delete from public.unconfirmed_marks where member_id = p_member_id and work_date = p_work_date;
  if found then
    return false;
  end if;

  insert into public.unconfirmed_marks (member_id, work_date)
  select p_member_id, p_work_date
  where not exists (
    select 1 from public.attendance_records r where r.member_id = p_member_id and r.work_date = p_work_date
  )
  on conflict do nothing;
  return found;
end;
$$;

revoke execute on function public.toggle_unconfirmed(bigint, date) from public, anon, authenticated;
grant execute on function public.toggle_unconfirmed(bigint, date) to service_role;

-- 근태 JSON이 반영되는 칸의 미확인은 같은 트랜잭션에서 풀린다.
create or replace function public.apply_attendance_changes(changes jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  affected integer;
begin
  insert into public.attendance_history (member_id, work_date, type, period, time_range, note, received_at)
  select r.member_id, r.work_date, r.type, r.period, r.time_range, r.note, r.received_at
  from jsonb_to_recordset(changes) as c (member_id bigint, work_date date)
  join public.attendance_records r on r.member_id = c.member_id and r.work_date = c.work_date;

  insert into public.attendance_records (member_id, work_date, type, period, time_range, note, received_at)
  select c.member_id, c.work_date, c.type, c.period, c.time_range, c.note, c.received_at
  from jsonb_to_recordset(changes) as c (
    member_id bigint, work_date date, type text, period text, time_range text, note text, received_at timestamptz
  )
  on conflict (member_id, work_date) do update
    set type = excluded.type,
        period = excluded.period,
        time_range = excluded.time_range,
        note = excluded.note,
        received_at = excluded.received_at,
        updated_at = now();

  get diagnostics affected = row_count;

  delete from public.unconfirmed_marks m
  using jsonb_to_recordset(changes) as c (member_id bigint, work_date date)
  where m.member_id = c.member_id and m.work_date = c.work_date;

  return affected;
end;
$$;
