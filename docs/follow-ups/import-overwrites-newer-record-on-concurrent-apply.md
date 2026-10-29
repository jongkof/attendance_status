# 동시에 반영하면 더 최근 공지로 바뀐 칸을 오래된 공지가 덮어쓸 수 있다

**Symptom**: 근태 JSON 반영 계획은 저장 전에 한 번 세우고, 저장 함수는 수신 시각을 다시 비교하지 않는다. 계획을 세운 뒤 저장되기 전에 다른 반영이 같은 칸을 더 최근 공지로 바꾸면, 오래된 공지가 그 칸을 덮어쓴다.

**Observed evidence**: 코드 리뷰(`code-review low`)가 `supabase/migrations/20261029000000_attendance.sql`의 `apply_attendance_changes`에서 지적했다. 실제로 재현하지는 않았다. 관리자 한 명이 순서대로 쓰는 경로의 수용 기준 11개는 모두 통과했다.

**Suspected cause**: `apply_attendance_changes`의 `on conflict ... do update`에 `received_at` 조건이 없다.

**What was tried**: 없음. 입력 화면이 잠겨 있지 않은 임시 동작이어서 여러 사람이 동시에 반영할 가능성이 있다.

**Proposed next step**: `do update`에 `where excluded.received_at >= public.attendance_records.received_at`를 추가하고, 건너뛴 칸을 반환값으로 알려 준다. 이력 기록 대상도 같은 조건으로 맞춘다.
