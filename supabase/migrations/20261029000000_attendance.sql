-- 근태 현황판: 팀원 명단, 근태 기록, 교체된 이전 값(이력)
-- 앱은 서버에서만 secret key로 접근하므로 RLS를 켜고 정책은 두지 않는다.

create table public.members (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order integer not null unique
);

create table public.attendance_records (
  member_id bigint not null references public.members (id),
  work_date date not null,
  type text not null check (type in ('휴가', '반차', '반반차', '리모트', '출장', '교육', '건강검진', '출근')),
  period text,
  time_range text,
  note text,
  received_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (member_id, work_date)
);

create index attendance_records_work_date_idx on public.attendance_records (work_date);

create table public.attendance_history (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members (id),
  work_date date not null,
  type text not null,
  period text,
  time_range text,
  note text,
  received_at timestamptz not null,
  replaced_at timestamptz not null default now()
);

create index attendance_history_member_date_idx on public.attendance_history (member_id, work_date);

alter table public.members enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_history enable row level security;

revoke all on table public.members, public.attendance_records, public.attendance_history from anon, authenticated;

-- 바뀌는 칸을 한 번에 반영한다. 이전 값을 이력에 옮기고 새 값을 쓰는 일이 한 트랜잭션에서 끝난다.
create function public.apply_attendance_changes(changes jsonb)
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
  return affected;
end;
$$;

revoke execute on function public.apply_attendance_changes(jsonb) from public, anon, authenticated;
grant execute on function public.apply_attendance_changes(jsonb) to service_role;

insert into public.members (name, sort_order) values
  ('양ㅇㅇ', 1), ('홍ㅇㅇ', 2), ('이ㅇㅇ', 3), ('김ㅇㅇ', 4), ('박ㅇㅇ', 5), ('곽ㅇㅇ', 6),
  ('최ㅇㅇ', 7), ('임ㅇㅇ', 8), ('김ㅇㅇ2', 9), ('이ㅇㅇ2', 10), ('심ㅇㅇ', 11), ('최ㅇㅇ2', 12),
  ('이ㅇㅇ3', 13), ('장ㅇㅇ', 14), ('오ㅇㅇ', 15), ('유ㅇㅇ', 16), ('김ㅇㅇ3', 17), ('강ㅇㅇ', 18),
  ('한ㅇㅇ', 19), ('류ㅇㅇ', 20), ('김ㅇㅇ4', 21), ('윤ㅇㅇ', 22);
