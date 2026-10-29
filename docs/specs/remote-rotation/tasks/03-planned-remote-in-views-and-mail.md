# 03 — 계획된 리모트를 팀 화면과 메일·집계에 반영

## Outcome

02에서 정한 조 편성과 리모트 계획이 공개·관리자 현황표, 현황 메일, 집계에 나타난다. 같은 조 팀원이 연달아 묶여 보이고, 계획된 리모트는 “리” 칸으로 채워지며, 메일의 리모트 구역과 집계와 제목이 같은 계획을 반영한다.

## Blockers

- 02: 조 편성, 순환 규칙, 계획된 리모트 계산이 있어야 현황표와 메일이 읽을 수 있다.

## Acceptance criteria

- [x] 현황표 팀원 순서는 조 편성 순서(조 순서, 조 안 순서)를 따른다. 조에 속하지 않은 팀원은 맨 위에 라벨 없이 놓이고, 조 사이에는 굵은 구분선이, 조 안에는 세로 띠가 보인다. 공개 화면과 관리자 화면이 같은 순서를 쓴다.
- [x] 계획된 리모트 칸이 현황표에 “리” 칸으로 채워진다. 휴일인 날, 리모트 없는 주, 같은 날 다른 근태 기록(휴가 등)이 있는 칸에는 채워지지 않고 기록이 우선한다.
- [x] 공지로 알린 리모트 기록과 계획된 리모트가 같은 칸에 겹치면 한 번만 센다.
- [x] 현황 메일의 리모트 구역에 그날 계획된 리모트 대상자가 들어가고, 집계의 리모트 인원과 제목의 리모트 수가 같은 값을 쓴다. 집계의 합은 여전히 명단 인원수와 같다.
- [x] 관리자 현황표의 하단 집계도 계획된 리모트를 반영한다.
- [x] 휴일·행사가 있는 주와 리모트 없는 주에는 계획된 리모트가 없으므로 메일 리모트 구역에도 나타나지 않는다.
- [x] 조 편성이 비어 있거나 규칙이 적용되지 않은 달에는 현황표와 메일이 이전과 같은 모양으로 나온다.

## Constraints

- 시안(`prototype.html`)의 관리자 현황표 중 조 띠, 굵은 구분선, 미배정 위치, 계획된 “리” 칸의 상태만 따른다. 칸 모양과 범례는 01이 한다.
- 집계 규칙은 `docs/decisions/attendance-summary.md`를 따른다. 합이 명단 인원수와 같다는 계약이 유지되어야 한다.
- `docs/specs/daily-mail-body/spec.md`의 “근태 기록만으로 계산한다”는 전제가 이 작업으로 바뀐다. 메일 구성과 문구는 그 스펙을 따르고, 리모트 구역과 집계와 제목의 입력만 계획을 포함하도록 넓힌다.
- 공개·관리자 화면, 메일, 집계는 같은 계획을 읽어 서로 값이 어긋나지 않는다. 조 편성과 규칙의 저장은 02가 한 대로 쓰고 바꾸지 않는다.
- 시험에 쓰는 이름은 성+ㅇㅇ 형태로 마스킹된 것만 쓴다.

## Verification

- 계산 단위 테스트: 계획된 리모트와 공지 기록의 겹침, 휴가 등 기록 우선, 휴일·리모트 없는 주 제외, 집계 합이 명단 인원수와 같음, 편성이 비어 있을 때 이전과 같은 결과.
- 메일 단위 테스트: 계획된 리모트가 리모트 구역과 집계와 제목에 같은 수로 나옴.
- 컴포넌트 테스트: 조 순서 정렬, 미배정 맨 위 라벨 없음, 조 띠와 구분선, 계획된 “리” 칸.
- 실제 화면: 02에서 편성한 조로 공개·관리자 현황표와 `/admin/mail` 미리보기를 열어 같은 날의 리모트 인원이 화면, 집계, 메일에서 일치하는지 확인한다.

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
completed

## Execution

<!-- Append concise evidence and preserve earlier entries when status changes.
Execution Blocker is the current impediment for an active task, not a declared
task dependency. In a superseded task, preserved entries are historical. -->
- Verification: 단위·컴포넌트 테스트(lib/remote/plan.test.ts, lib/attendance/summary.test.ts, lib/mail/build-mail.test.ts, components/attendance-table.test.tsx) 포함 vitest 155개 통과, eslint 통과. 코드 리뷰 low 1회: 지적 없음. 실제 화면(공개·관리자 현황표, /admin/mail 미리보기 대조)은 운영 DB에 조 편성과 규칙이 없어 편성 기반 표시를 보지 못했다(편성이 없을 때 이전과 같은 모양인지만 확인). 사용자가 단위·컴포넌트 테스트로 대체하기로 했고, 실제 편성을 쓰기 시작할 때 화면을 확인한다. 새 SQL 없음. 관리자 하단 집계 행은 이 작업에서 새로 만들었다.
- Blocker: —
- Revision: —
