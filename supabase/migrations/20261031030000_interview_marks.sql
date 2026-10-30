-- 면담 표시: 팀장 1on1 면담이 있는 사람과 날짜. 근태가 아니라 리마인드용 표시라서 메모와 시간은 두지 않는다.
-- 행이 있으면 그날 면담이 있다. 근태 기록, 집계와는 무관하게 따로 저장한다.
-- 앱은 서버에서만 secret key로 접근하므로 RLS를 켜고 정책은 두지 않는다.

create table public.interview_marks (
  member_id bigint not null references public.members (id),
  work_date date not null,
  created_at timestamptz not null default now(),
  primary key (member_id, work_date)
);

create index interview_marks_work_date_idx on public.interview_marks (work_date);

alter table public.interview_marks enable row level security;

revoke all on table public.interview_marks from anon, authenticated;
