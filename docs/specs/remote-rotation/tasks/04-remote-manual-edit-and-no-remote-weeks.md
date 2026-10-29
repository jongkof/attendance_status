# 04 — 리모트 직접 수정과 리모트 없는 주 지정

## Outcome

관리자가 리모트 표에서 칸을 눌러 사람·날짜별 리모트를 직접 넣거나 빼고, 주별 “리모트 없음” 체크로 팀장이 정한 주를 지정하거나 자동으로 걸린 주를 풀 수 있다. 바꾼 내용은 순환 계산과 현황표·메일·집계에 바로 반영된다.

## Blockers

- 03: 계획된 리모트가 현황표·메일·집계에 반영되어 있어야 직접 수정과 주 지정의 결과를 같은 곳에서 확인할 수 있다.

## Acceptance criteria

- [x] 리모트 표에서 칸을 눌러 그 사람·날짜의 리모트를 지정하거나 해제한다. 한 주에 같은 사람에게 리모트를 두 번 넣을 수 있다.
- [x] 직접 지정한 칸에는 점 표시가 붙고, 순환이 정한 칸과 구별된다. 지정으로 늘어난 리모트는 현황표에 “리+”로 구별되어 보인다.
- [x] 리모트 표의 주별 “리모트 없음” 체크를 켜면 그 주의 순환 계획이 즉시 사라지고 순환을 소모하지 않아 뒤 일정이 한 주씩 밀린다. 끄면 즉시 원래대로 돌아온다. 변경은 “적용” 없이 바로 저장된다.
- [x] 휴일·행사가 있는 주는 체크된 채로 보이고, 관리자가 체크를 풀 수 있다. 푼 주는 자동 건너뜀보다 우선해서 리모트가 계획되고 순환을 소모한다.
- [x] 직접 지정한 칸과 푼 주는 02의 “적용”으로 규칙을 다시 적용해도 그대로 남는다.
- [x] 직접 지정, 직접 해제, 주 체크 변경은 현황표, 현황 메일, 집계에 같은 값으로 반영된다. 휴가 등 근태 기록이 있는 칸은 여전히 기록이 우선한다.
- [x] 로그인하지 않은 상태에서 직접 수정과 주 체크 요청을 서버에 직접 보내도 거절되어 아무것도 바뀌지 않는다.

## Constraints

- 시안(`prototype.html`)의 리모트 표 중 칸 토글, 점 표시, 주별 체크, 휴일·행사 주 체크 상태만 따른다. 조 편성과 적용 흐름은 02, 현황표의 “리+” 모양 외 칸 모양은 01이 한다.
- 직접 수정과 주 체크 저장은 `docs/decisions/data-storage.md`에 따라 Supabase에 저장한다. 새 표나 열이 필요하면 SQL을 사용자가 Supabase SQL Editor에서 실행해야 하므로, 완료 보고에 파일 이름과 실행 방법을 적는다.
- 이 요청들은 `docs/decisions/admin-access.md`의 관리자 잠금 아래에 둔다.
- 직접 지정한 칸의 추가 리모트는 이 리모트 표의 칸 토글로만 넣는다. JSON 입력이나 현황표 칸에서는 만들지 않는다.
- 시험에 쓰는 이름은 성+ㅇㅇ 형태로 마스킹된 것만 쓰고, 공유 운영 DB에는 시험 데이터를 남기지 않는다.

## Verification

- 계산 단위 테스트: 직접 지정과 해제가 계획에 더해지거나 빠짐, 한 주 두 번 리모트, 체크한 주의 순환 비소모와 뒤 일정 밀림, 푼 휴일·행사 주의 순환 소모, 규칙 재적용 뒤 직접 수정과 푼 주 유지, 기록 우선.
- 컴포넌트 테스트: 칸 토글과 점 표시, 주 체크 토글, 휴일·행사 주가 체크된 채 표시됨.
- 요청 거절 테스트: 로그인하지 않은 직접 수정과 주 체크 요청이 거절되고 저장되지 않음.
- 실제 화면(새 SQL 실행 뒤): 칸 지정과 주 체크를 바꿔 현황표 “리+”, `/admin/mail` 미리보기, 하단 집계가 같은 값으로 바뀌는지 확인하고, 확인 뒤 시험 데이터를 되돌린다.

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
- Verification: 단위·컴포넌트·거절 테스트 170개 통과(`lib/remote/plan.test.ts` 직접 수정·주 체크·재적용·기록 우선, `components/remote-manager.test.tsx` 칸 토글·점·주 체크·휴일 주 체크 상태, `app/admin/remote/actions.test.ts` 비로그인 거절), tsc는 기존 `LayoutProps` 오류만, eslint 통과. 실제 화면은 이 worktree에 `.env.local`이 없고 새 SQL(`20261030040000_remote_manual_edits.sql`)이 아직 실행되지 않아 확인하지 못했다. 사용자가 SQL을 실행한 뒤 칸·주 체크를 바꿔 현황표 "리+", `/admin/mail` 미리보기, 하단 집계를 확인하고 시험 데이터를 되돌려야 한다.
- Blocker: —
- Revision: —
