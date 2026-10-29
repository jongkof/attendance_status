-- 달력 항목: 관리자가 등록하는 휴일과 행사. 정부 공휴일의 처음 데이터(2026–2027)도 여기에 넣는다.
-- 회사 규정 휴일(근로자의 날, 회사창립기념일, 노조창립기념일)은 앱이 규칙으로 계산하므로 저장하지 않는다.
-- 설날·추석은 회사 규정에 따라 명절 전일, 당일, 익일, 그 익일의 4일을 모두 휴일로 넣는다.
-- 앱은 서버에서만 secret key로 접근하므로 RLS를 켜고 정책은 두지 않는다.

create table public.calendar_entries (
  id bigint generated always as identity primary key,
  entry_date date not null,
  kind text not null check (kind in ('holiday', 'event')),
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (entry_date, kind)
);

alter table public.calendar_entries enable row level security;

revoke all on table public.calendar_entries from anon, authenticated;

insert into public.calendar_entries (entry_date, kind, name) values
  -- 2026
  ('2026-01-01', 'holiday', '신정'),
  ('2026-02-16', 'holiday', '설날 연휴'),
  ('2026-02-17', 'holiday', '설날'),
  ('2026-02-18', 'holiday', '설날 연휴'),
  ('2026-02-19', 'holiday', '설날 연휴'),
  ('2026-03-01', 'holiday', '3·1절'),
  ('2026-03-02', 'holiday', '3·1절 대체공휴일'),
  ('2026-05-05', 'holiday', '어린이날'),
  ('2026-05-24', 'holiday', '부처님오신날'),
  ('2026-05-25', 'holiday', '부처님오신날 대체공휴일'),
  ('2026-06-03', 'holiday', '지방선거일'),
  ('2026-06-06', 'holiday', '현충일'),
  ('2026-07-17', 'holiday', '제헌절'),
  ('2026-08-15', 'holiday', '광복절'),
  ('2026-08-17', 'holiday', '광복절 대체공휴일'),
  ('2026-09-24', 'holiday', '추석 연휴'),
  ('2026-09-25', 'holiday', '추석'),
  ('2026-09-26', 'holiday', '추석 연휴'),
  ('2026-09-27', 'holiday', '추석 연휴'),
  ('2026-10-03', 'holiday', '개천절'),
  ('2026-10-05', 'holiday', '개천절 대체공휴일'),
  ('2026-10-09', 'holiday', '한글날'),
  ('2026-12-25', 'holiday', '성탄절'),
  -- 2027
  ('2027-01-01', 'holiday', '신정'),
  ('2027-02-06', 'holiday', '설날 연휴'),
  ('2027-02-07', 'holiday', '설날'),
  ('2027-02-08', 'holiday', '설날 연휴'),
  ('2027-02-09', 'holiday', '설날 연휴'),
  ('2027-03-01', 'holiday', '3·1절'),
  ('2027-05-05', 'holiday', '어린이날'),
  ('2027-05-13', 'holiday', '부처님오신날'),
  ('2027-06-06', 'holiday', '현충일'),
  ('2027-07-17', 'holiday', '제헌절'),
  ('2027-07-19', 'holiday', '제헌절 대체공휴일'),
  ('2027-08-15', 'holiday', '광복절'),
  ('2027-08-16', 'holiday', '광복절 대체공휴일'),
  ('2027-09-14', 'holiday', '추석 연휴'),
  ('2027-09-15', 'holiday', '추석'),
  ('2027-09-16', 'holiday', '추석 연휴'),
  ('2027-09-17', 'holiday', '추석 연휴'),
  ('2027-10-03', 'holiday', '개천절'),
  ('2027-10-04', 'holiday', '개천절 대체공휴일'),
  ('2027-10-09', 'holiday', '한글날'),
  ('2027-10-11', 'holiday', '한글날 대체공휴일'),
  ('2027-12-25', 'holiday', '성탄절'),
  ('2027-12-27', 'holiday', '성탄절 대체공휴일');
