-- 개별 수정: 관리자가 현황표 팝업에서 한 칸의 근태 기록을 직접 고치거나 지운다.
-- 직접 수정한 기록은 시간과 비고가 없고 수정 시각을 수신 시각으로 가진다.
-- 기록이 바뀌는 칸의 미확인(?) 표시와 아침 확인 결과도 같은 트랜잭션에서 지운다.
-- 교체되거나 지워지는 이전 기록은 근태 이력으로 옮겨진다.
-- p_type이 null이면 기록 지우기다.

create function public.edit_attendance_cell(
  p_member_id bigint,
  p_work_date date,
  p_type text,
  p_period text,
  p_received_at timestamptz
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.attendance_history (member_id, work_date, type, period, time_range, note, received_at)
  select r.member_id, r.work_date, r.type, r.period, r.time_range, r.note, r.received_at
  from public.attendance_records r
  where r.member_id = p_member_id and r.work_date = p_work_date;

  if p_type is null then
    delete from public.attendance_records where member_id = p_member_id and work_date = p_work_date;
  else
    insert into public.attendance_records (member_id, work_date, type, period, time_range, note, received_at)
    values (p_member_id, p_work_date, p_type, p_period, null, null, p_received_at)
    on conflict (member_id, work_date) do update
      set type = excluded.type,
          period = excluded.period,
          time_range = null,
          note = null,
          received_at = excluded.received_at,
          updated_at = now();
  end if;

  delete from public.unconfirmed_marks where member_id = p_member_id and work_date = p_work_date;
  delete from public.morning_confirmations where member_id = p_member_id and work_date = p_work_date;
end;
$$;

revoke execute on function public.edit_attendance_cell(bigint, date, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.edit_attendance_cell(bigint, date, text, text, timestamptz) to service_role;
