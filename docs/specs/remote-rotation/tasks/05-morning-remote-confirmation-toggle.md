# 05 — 아침 확인 3단계 토글

## Outcome

관리자가 아침 8시경 현황표에서 리모트처럼 보이는 칸(계획된 리모트와 공지로 알린 리모트 모두)을 눌러 리모트 → 출근 → 미확인(?) → 리모트로 바꾼다. 확인 결과는 근태 기록을 바꾸지 않고 공개 현황, 현황 메일, 집계에 반영된다.

## Blockers

- 03: 계획된 리모트가 현황표·메일·집계에 반영되어 있어야 계획된 리모트 칸을 토글하고 그 결과를 집계와 메일에서 확인할 수 있다.

## Acceptance criteria

- [ ] 관리자 현황표에서 오늘과 지난 날짜의 리모트 칸(계획된 리모트와 공지 기록 리모트 모두)을 누를 때마다 리모트 → 출근 → 미확인(?) → 리모트 순서로 바뀐다.
- [ ] 휴일 칸, 미래 칸, 리모트가 아닌 다른 근태 기록 칸은 이 토글로 바뀌지 않는다. 기존의 일정 없는 칸 출근 ↔ 미확인 토글은 그대로 동작한다.
- [ ] 눌러서 바꿀 수 있는 리모트 칸은 포인터, 호버 테두리, 다음 상태 툴팁을 보인다.
- [ ] 확인 결과는 근태 기록과 이력을 바꾸지 않는다. 같은 날짜의 근태 JSON을 다시 반영해도 확인 결과는 유지된다.
- [ ] “출근”으로 확인된 칸은 공개 현황표에 출근으로, “미확인”으로 확인된 칸은 미확인(?)으로 보이고, 현황 메일과 집계에서 리모트가 아니라 각각 출근과 미확인으로 센다. 집계의 합은 명단 인원수와 같다.
- [ ] 다시 “리모트”로 돌리면 원래 리모트(계획 또는 기록)로 돌아간다.
- [ ] 로그인하지 않은 상태에서 이 토글 요청을 서버에 직접 보내도 거절되어 아무것도 바뀌지 않는다.

## Constraints

- 시안(`prototype.html`)의 아침 확인 3단계 토글 상태와 단서만 따른다. 칸 모양은 01이, 계획된 리모트의 표시는 03이 한다.
- 집계 규칙은 `docs/decisions/attendance-summary.md`를 따른다. 합이 명단 인원수와 같다는 계약이 유지되어야 한다.
- 확인 결과 저장은 `docs/decisions/data-storage.md`에 따라 Supabase에 저장한다. 기존 미확인 표시(`docs/specs/unconfirmed-attendance-mark/spec.md`)의 저장과 의미를 그대로 쓰거나 넓히는 것으로 충분한지 구현 때 현재 코드로 판단한다. 새 표나 열이 필요하면 SQL을 사용자가 Supabase SQL Editor에서 실행해야 하므로, 완료 보고에 파일 이름과 실행 방법을 적는다.
- 이 요청은 `docs/decisions/admin-access.md`의 관리자 잠금 아래에 둔다.
- 시험에 쓰는 이름은 성+ㅇㅇ 형태로 마스킹된 것만 쓰고, 공유 운영 DB에는 시험 데이터를 남기지 않는다.

## Verification

- 계산 단위 테스트: 3단계 순환 순서, 계획 리모트와 기록 리모트 모두 해당, 출근과 미확인 집계 반영, 합이 명단 인원수와 같음, 근태 JSON 재반영 뒤 확인 결과 유지.
- 컴포넌트 테스트: 눌러서 바꿀 수 있는 칸의 단서, 휴일·미래·다른 근태 기록 칸이 눌리지 않음.
- 요청 거절 테스트: 로그인하지 않은 토글 요청이 거절되고 저장되지 않음.
- 실제 화면: 오늘 날짜의 리모트 칸을 눌러 3단계를 돌려 보며 공개 현황표, `/admin/mail` 미리보기, 하단 집계가 같이 바뀌는지 확인하고, 확인 뒤 시험 표시를 되돌린다.

## Review checkpoint

None.

## Status

<!-- Current values: `pending`, `in-progress`, `completed`, `blocked`, or
`superseded`.
`completed` is valid only while all acceptance criteria and focused
verification pass. Use `superseded` only after an approved replacement of a
task with recorded completion history. Preserve its Execution evidence and name
the replacement and reason under Revision; it is then terminal for that approved
breakdown and outside the current delivery map. -->
pending

## Execution

<!-- Append concise evidence and preserve earlier entries when status changes.
Execution Blocker is the current impediment for an active task, not a declared
task dependency. In a superseded task, preserved entries are historical. -->
- Verification: —
- Blocker: —
- Revision: —
