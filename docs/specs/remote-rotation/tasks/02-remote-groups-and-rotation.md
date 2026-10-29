# 02 — 조 편성과 순환 규칙

## Outcome

관리자가 리모트 조를 편성하고 요일 순서, 기준 주, 조별 시작 요일을 정한 뒤, 리모트 표에서 결과를 미리 보고 “적용”해서 저장한다. 근무일에 휴일이나 행사가 있는 주는 자동으로 리모트가 없고 순환을 소모하지 않는다. 이 작업이 끝나면 관리자는 계획된 리모트를 리모트 표에서 볼 수 있다. 현황표와 메일은 03에서 바뀐다.

## Blockers

None.

## Acceptance criteria

- [ ] 관리자 화면에 리모트 관리 메뉴가 있고, 팀원을 눌러 선택한 뒤 조 버튼으로 그 조에 배정하거나 미배정으로 옮길 수 있다. 조 이름을 바로 고치고 조를 추가·삭제할 수 있으며, 조를 삭제하면 그 팀원은 미배정이 된다. 조 이름 기본값은 “1조”, “2조”처럼 순번이다.
- [ ] 요일 순서(“리모트 없음” 단계 포함), 기준 주(달력에서 고른 날이 어느 요일이든 그 날이 속한 주), 조별 시작 요일을 정할 수 있다.
- [ ] 5개 조와 월→화→수→목→금 순서에서, 기준 주에 조1이 월요일이면 다음 주 조1은 화요일이고 조5는 월요일로 이어진다. 끝에 닿으면 처음으로 돌아간다. 과거 규칙 화→목→수→금과 4개 조도 같은 방식으로 계산된다.
- [ ] 근무일(월–금)에 휴일(규칙으로 계산되는 회사 휴일 포함)이나 행사가 하나라도 있는 주는 자동으로 리모트가 없고 순환을 소모하지 않는다. 기준 주를 2026-09-28 주(조1 월요일)로 하면 2026-10-05 주(개천절 대체공휴일, 한글날)는 리모트가 없고, 10-12 주는 9/28 주 다음 단계(조1 화요일)로 이어진다. 주말에만 걸린 휴일·행사는 영향이 없다.
- [ ] 휴일인 날은 리모트가 아니다.
- [ ] 리모트 표(읽기 전용)에서 월을 전환하며 계획을 본다. 노란 칸은 리모트, 흰 칸은 리모트 아님이고, 휴일은 음영, 다른 근태 기록이 있는 칸은 그 근태의 색과 한 글자로 보인다. 휴일·행사가 있는 주는 “리모트 없음”이 표시된다(풀기는 04).
- [ ] 요일 순서, 기준 주, 조별 시작 요일을 바꾸면 리모트 표에 변경이 미리 반영되고 “적용”을 누르기 전에는 저장되지 않으며, “되돌리기”로 취소한다.
- [ ] “적용”을 누르면 “기준 주 이후의 패턴만 바뀌고 기준 주 이전은 이전 패턴을 유지한다. 이전 패턴이 없으면 이전 주도 새 패턴으로 계산된다. 직접 고친 칸과 근태 기록은 그대로 남는다”는 주의 메시지가 뜨고, 확인해야 적용된다. 적용하면 기준 주 이후에 있던 이전 규칙은 덮어쓴다.
- [ ] 조 수(팀원이 있는 조)가 요일 순서의 단계 수보다 많거나 단계가 하나도 없으면 오류 메시지가 나오고 “적용”이 막힌다.
- [ ] 새로 고쳐도 편성과 적용된 규칙이 유지된다.
- [ ] 로그인하지 않으면 리모트 관리 화면은 로그인 화면으로 이동하고, 조 편성과 규칙 적용 요청을 서버에 직접 보내도 거절되어 아무것도 바뀌지 않는다.

## Constraints

- 시안(`prototype.html`)의 리모트 관리 화면 중 조 편성, 요일 순서 편집, 기준 주 선택, 적용 흐름(미리 반영, 주의 메시지, 되돌리기), 리모트 표(읽기 전용)의 상태만 따른다.
- 휴일은 `docs/decisions/holiday-source.md`가 정한 출처(규칙 계산과 저장된 달력 항목)를 읽어 판정한다. 행사는 저장된 달력 항목의 행사를 읽는다.
- 이 화면과 요청은 `docs/decisions/admin-access.md`의 관리자 잠금 아래에 둔다.
- 편성과 규칙은 `docs/decisions/data-storage.md`에 따라 Supabase에 저장한다. 새 표를 만드는 SQL은 사용자가 Supabase SQL Editor에서 실행해야 하므로, 완료 보고에 파일 이름과 실행 방법을 적는다.
- 이 작업은 공개·관리자 현황표, 현황 메일, 집계를 바꾸지 않는다. 직접 고친 칸과 주별 체크 조작은 04가 한다.
- 시험에 쓰는 이름은 성+ㅇㅇ 형태로 마스킹된 것만 쓴다.

## Verification

- 순환 계산 단위 테스트: 기준 주 이후와 이전, 조별 시작 요일, 끝에서 처음으로 돌아가기, “리모트 없음” 단계, 휴일·행사가 있는 주 자동 건너뛰기와 순환 비소모(위 9/28 → 10/12 예시), 주말에만 걸린 휴일, 휴일인 날 제외, 조 수가 단계 수를 넘는 경우의 거절.
- 규칙 적용 단위 테스트: 적용 전에는 저장되지 않음, 기준 주 이전 유지, 이후 덮어쓰기.
- 컴포넌트 테스트: 조 편성 이동과 삭제, 미리 반영과 되돌리기, 적용 전 주의 메시지, 적용 막힘 오류.
- 실제 화면(새 SQL 실행 뒤): 조를 편성하고 규칙을 적용해 리모트 표의 2026-10-19 주, 10-26 주, 11-02 주 이동을 확인하고, 새로 고침 뒤 유지와 로그아웃 뒤 거절을 확인한다.

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
in-progress

## Execution

<!-- Append concise evidence and preserve earlier entries when status changes.
Execution Blocker is the current impediment for an active task, not a declared
task dependency. In a superseded task, preserved entries are historical. -->
- Verification: 단위 테스트(lib/remote/rotation.test.ts), 컴포넌트 테스트(components/remote-manager.test.tsx), vitest 전체 134개 통과. 비로그인 /admin/remote는 로그인 화면으로 이동(실제 서버 확인). 코드 리뷰 low 1회: 지적 1건(starts 누락 요청, 일반 사용 경로 아님)은 기록만 하고 고치지 않음.
- Blocker: 실제 화면 검증(편성·적용·새로고침·10-19/10-26/11-02 주 이동·로그아웃 뒤 거절)은 사용자가 supabase/migrations/20261030000000_remote_rotation.sql을 Supabase SQL Editor에서 실행하고, 이 작업 폴더에 .env.local이 있어야 가능하다.
- Revision: —
