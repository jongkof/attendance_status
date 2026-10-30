# 아침 확인 토글: 기존 미확인 표시가 남은 계획 리모트 칸

- 증상: 계획된 리모트 칸에 예전 미확인(`unconfirmed_marks`) 표시가 남아 있으면 표는 기존 출근↔미확인 토글을 보이지만, `toggleMorningConfirmation`은 그 칸을 리모트 칸으로 보고 확인 결과를 저장할 수 있다. 저장된 행은 표시에 쓰이지 않는다.
- 근거: `app/admin/actions.ts`의 `isRemoteCell` 판정이 `unconfirmed_marks`를 보지 않고, `components/attendance-table.tsx`의 `remoteLooking`은 본다.
- 제안: 액션에서 `getUnconfirmed`로 같은 칸의 표시 여부를 읽어 `isRemoteCell`에서 제외한다.
