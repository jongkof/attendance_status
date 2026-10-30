-- 팀원 명단 관리: 재직 기간(시작일, 제거일).
-- 제거는 삭제가 아니라 제거일을 두는 것이다. 기존 팀원은 둘 다 비워 처음부터 재직 중으로 둔다.
-- 어떤 날짜에 재직 중이라는 것은 시작일 이후이고 제거일 이전(제거일 당일은 재직 아님)이라는 뜻이다.

alter table public.members
  add column start_date date,
  add column removed_on date,
  add constraint members_tenure_order check (start_date is null or removed_on is null or removed_on > start_date);
