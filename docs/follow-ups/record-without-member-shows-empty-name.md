# 명단 관계가 없는 근태 기록은 빈 이름으로 읽혀 조용히 사라진다

**Symptom**: `members` 행이 없어진 근태 기록을 읽으면 이름이 빈 문자열인 기록이 되어 현황표의 어느 칸에도 나타나지 않고, 반영 비교에서도 빠진다.

**Observed evidence**: 코드 리뷰(`code-review low`)가 `lib/attendance/store.ts`의 `toRecord`에서 지적했다. `attendance_records.member_id`가 외래 키라서 지금은 팀원 삭제 기능이 없어 발생하지 않는다.

**Suspected cause**: `row.members?.name ?? ""`가 관계가 없는 경우를 오류로 다루지 않는다.

**What was tried**: 없음. 이번 범위에는 팀원 추가·제거가 없다.

**Proposed next step**: 명단 관리 작업에서 팀원 제거 방식(과거 기록 보존)을 정할 때, 관계가 없으면 오류를 던지거나 보존용 이름 열을 쓰도록 함께 정한다.
