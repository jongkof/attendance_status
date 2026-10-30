# 02 — 미등록 연도 안내

## Outcome

정부 공휴일이 등록되지 않은 해를 관리자가 볼 때, 달력 편집 화면과 관리자 현황표와 현황 메일 미리보기에 그 사실과 등록 방법이 안내된다. 11월 1일부터는 다음 해가 비어 있으면 미리 알린다. 안내에는 두 가지 방법의 번호 단계 설명이 접고 펼칠 수 있게 붙는다. 공개 현황표에는 나오지 않는다.

## Blockers

None.

## Acceptance criteria

- [ ] 저장된 휴일(달력 항목의 휴일)이 하나도 없는 연도의 달력 편집 화면, 관리자 현황표, 메일 미리보기에 "그 해 공휴일이 아직 등록되지 않아 공휴일이 출근으로 보일 수 있다"는 안내가 나온다. 저장된 휴일이 있는 연도에는 나오지 않는다. 회사 규정 휴일은 저장된 휴일에 세지 않는다.
- [ ] 공개 현황표에는 어느 연도에도 안내가 나오지 않는다.
- [ ] 11월 1일부터는 다음 해가 미등록이면 보고 있는 연도와 상관없이 위 세 화면에 "내년 공휴일이 아직 등록되지 않았습니다" 안내가 나온다. 10월 31일까지는 나오지 않는다.
- [ ] 안내의 "등록 방법 보기"를 누르면 방법 1(달력 편집 화면에서 하나씩 등록)과 방법 2(준비된 SQL 파일을 Supabase SQL Editor에서 실행)의 번호 단계가 펼쳐지고, 다시 누르면 접힌다. 접힌 상태에서는 한 줄만 보인다.
- [ ] 방법 2의 단계에 개발 담당자에게 SQL 파일을 받는다, Supabase 대시보드에서 프로젝트를 연다, SQL Editor, 새 쿼리, 내용 붙여넣기, Run, Success 확인, 달력 편집 화면 새로고침 순서가 모두 들어 있고, 같은 SQL을 두 번 실행해도 안전하다는 점과 오류가 나면 개발 담당자에게 오류 문구를 전달하라는 점이 적혀 있다.
- [ ] 달력 편집 화면에서 미등록 연도에 휴일을 하나 등록하면 새로 고침 뒤 안내가 사라진다.
- [ ] 로그인하지 않으면 안내가 보이는 관리자 화면에 들어갈 수 없다(기존 관리자 잠금 그대로).

## Constraints

- 안내의 조건과 문구, 두 방법의 단계는 이 스펙(`spec.md`)을 따른다. 조건은 저장된 휴일 유무 하나이고, 연도별 건수 기준은 정하지 않았다.
- 관리자 화면 안에서만 나온다. `docs/decisions/admin-access.md`의 잠금을 그대로 쓴다.
- 연도별 등록 여부는 이미 읽는 달력 항목에서 알 수 있으므로 새 저장소나 SQL은 필요 없다.
- 시안은 만들지 않았다. 화면 모양은 기존 관리자 화면의 경고 표시(Alert) 방식을 따른다.

## Verification

- 단위 테스트: 연도에 저장된 휴일이 없을 때와 있을 때, 회사 규정 휴일은 세지 않음, 10월 31일과 11월 1일 경계에서 내년 안내 여부.
- 컴포넌트 테스트: 안내의 접힘·펼침과 두 방법의 단계, 공개 현황표에 안내가 없음.
- 실제 화면: 개발 서버에서 2031년처럼 비어 있는 연도의 `/admin/calendar?year=2031`과 관리자 현황표, 메일 미리보기에서 안내가 나오고 2026년에는 나오지 않는 것, 로그인하지 않은 접근이 로그인 화면으로 가는 것을 확인한다. 실제 DB에 휴일을 등록하는 시험은 하지 않는다.

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
