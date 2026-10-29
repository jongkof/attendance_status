# 01 — 현황표 칸 모양 통일

## Outcome

공개 현황표와 관리자 현황표의 칸이 작은 정사각형과 한 글자 표기로 바뀌어, 한 화면에 더 많은 날짜가 들어오고 근태 유형이 한눈에 읽힌다. 두 화면은 같은 칸 모양과 범례를 쓰고, 관리자 화면에서는 기존의 출근 ↔ 미확인(?) 토글이 새 칸에서도 그대로 동작한다.

## Blockers

None.

## Acceptance criteria

- [x] 출근은 녹색(글자 없음), 리모트 “리”, 휴가 “휴”, 반차·반반차 “반”, 출장 “출”, 교육 “교”, 건강검진 “건”, 미확인은 점선 “?”, 휴일은 회색 칸으로 보인다.
- [x] 칸에 마우스를 올리면 한 글자로 줄어든 구분(반차 오전·오후, 반반차 구간, 시간, 비고)이 보인다. 공개 화면에서 칸을 눌러 상세를 보는 기존 동작은 유지된다.
- [x] 범례가 같은 한 글자 표기를 쓴다.
- [x] 근태 유형별 색, 휴일 음영과 빨간 날짜, 미확인 점선, 주 경계선, 오늘 열 강조는 그대로다.
- [x] 관리자 현황표에서 오늘과 지난 날짜의 일정 없는 칸을 눌러 출근 ↔ 미확인(?)을 바꾸고, 눌러서 바꿀 수 있는 칸은 포인터, 호버 테두리, 다음 상태 툴팁을 보인다. 미래 칸과 휴일 칸, 근태 기록이 있는 칸은 눌리지 않는다.
- [x] 날짜 열 너비가 이전보다 줄어, 같은 화면에 더 많은 날짜가 들어온다.

## Constraints

- 시안(`prototype.html`)의 관리자 현황표 중 칸 모양과 범례의 상태만 따른다. 조 띠와 조 편성은 03이 한다.
- 화면 구성 요소와 상태 표현은 `docs/decisions/ui-composition.md`를 따른다.
- “반”(반차·반반차)과 “건”(건강검진)은 범례와 마우스 올림 설명에 의존한다. 사용해 보고 헷갈리면 글자를 바꾸는 것이 스펙의 위험으로 남아 있다.

## Verification

- 표 컴포넌트 테스트: 근태 유형마다 칸의 글자와 색, 휴일 음영, 미확인 점선, 범례 표기, 마우스 올림 설명, 눌러서 바꿀 수 있는 칸의 단서와 눌리지 않는 칸(미래, 휴일, 기록 있는 칸)을 확인한다. 기존 테스트가 모두 통과한다.
- 린트와 타입 검사가 통과한다.
- 실제 화면: 개발 서버에서 2026년 10월 공개·관리자 현황표를 열어 칸 모양과 범례, 날짜 열 폭, 토글 동작을 확인한다.

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
- Verification: 컴포넌트 테스트 111개 통과, lint 통과, 개발 서버(포트 3001)에서 유형별 한 글자 칸·범례·열 폭 2.5rem·포인터·툴팁 확인. 공유 DB 환경변수가 없어 임시 더미 페이지로 확인했고 제거함. code-review low 1회, 지적 없음.
- Blocker: —
- Revision: —
