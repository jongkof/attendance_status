# 로그인이 만료된 뒤 다시 로그인하면 현황 메일의 선택한 날짜가 오늘로 돌아간다

**Symptom**: `/admin/mail?date=2026-10-26`을 열어 둔 상태에서 로그인이 만료되어 로그인 화면을 거치면, 로그인 뒤에 `?date=` 없이 `/admin/mail`(오늘)이 열려 보던 날짜를 다시 골라야 한다.

**Observed evidence**: 코드 리뷰(`code-review low`)가 `app/admin/mail/page.tsx`의 `requireAdmin("/admin/mail")` 호출에서 지적했고, 개발 서버에서 로그인 화면 주소가 `?next=%2Fadmin%2Fmail`로 날짜 없이 만들어지는 것을 확인했다. 본문 내용은 틀리지 않는다.

**Suspected cause**: `requireAdmin`에 경로만 넘기고 검색 조건(`date`)은 넘기지 않는다. `safeNextPath`는 `?month=…` 같은 검색 조건을 허용하지만 이 화면은 쓰지 않는다.

**What was tried**: 없음. 같은 방식으로 `/admin?month=…`도 월이 사라진다.

**Proposed next step**: 관리 화면이 현재 경로와 검색 조건을 함께 `requireAdmin`에 넘기도록 하고, `safeNextPath`가 `date` 같은 값을 허용하는지 확인한다.
