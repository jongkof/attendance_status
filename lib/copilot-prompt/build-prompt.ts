import { isValidDate } from "@/lib/attendance";

export type PromptRange = { start: string; end: string };

export type RangeCheck = { ok: true } | { ok: false; error: string };

/** 시작일과 종료일이 올바른 날짜이고 종료일이 시작일보다 앞서지 않는지. */
export function checkPromptRange({ start, end }: PromptRange): RangeCheck {
  if (!isValidDate(start) || !isValidDate(end)) return { ok: false, error: "시작일과 종료일을 올바른 날짜로 골라 주세요." };
  if (end < start) return { ok: false, error: "종료일은 시작일보다 앞설 수 없습니다." };
  return { ok: true };
}

/**
 * Copilot에 붙여 넣을 프롬프트. 원문은 docs/specs/copilot-prompt/prompt-template.md와 같다.
 * 날짜와 팀 명단만 채운다. 명단은 한 줄에 쉼표로 이어 쓴다.
 */
export function buildCopilotPrompt({ start, end }: PromptRange, names: readonly string[]): string {
  return `내 전체 받은편지함에서 ${start}부터 ${end}까지 수신한 근태 관련 메일(휴가, 연차, 반차, 반반차, 병가, 재택, 외근, 출장, 교육, 세미나, 건강검진, 지각, 조퇴, 휴가 취소 등)을 모두 찾아서, 아래 규칙에 따라 JSON으로만 정리해줘.

출력은 설명이나 다른 문장 없이 JSON만 내놓고, 마크다운 코드블록(\`\`\`)도 쓰지 말고 \`{\`로 시작해 \`}\`로 끝나게 해줘.

[팀 명단]
${names.join(", ")}

[규칙]

1. name은 근태 당사자 이름이며 반드시 위 팀 명단에 적힌 이름 그대로 쓴다. 다른 사람이 대신 보낸 메일도 당사자 기준이다. 명단에 없는 이름이면 그대로 적되 note에 "확인 필요"를 적는다.
2. type은 다음 8개 값 중 하나만 쓴다: "휴가", "반차", "반반차", "리모트", "출장", "교육", "건강검진", "출근"
   * 연차, 병가, 경조휴가, 공가 → "휴가"
   * 건강검진, 종합검진 → "건강검진" (공가로 처리되더라도 "휴가"가 아니다)
   * 재택, 원격근무 → "리모트"
   * 외근, 현장 방문, 외부 미팅 → "출장"
   * 세미나, 워크숍, 연수 → "교육"
   * 휴가 취소, 정상 출근 안내 → "출근" (휴가 취소는 취소된 날짜만 start와 end로 쓴다)
   * 지각, 조퇴 → "출근" (지각·조퇴 내용은 note에 적는다)
   * 시간을 미리 양해받은 늦은 출근·이른 퇴근은 지각·조퇴가 아니라 "반반차"로 본다. 어느 쪽인지 분명하지 않으면 "출근"으로 하고 note에 "확인 필요"를 적는다.
3. period는 다음 값만 쓴다.
   * 반차: "오전" 또는 "오후"
   * 반반차: "오전1"(09:00-11:00), "오전2"(10:00-12:00), "오후1"(13:00-15:00), "오후2"(16:00-18:00) 중 하나. 메일에 시간이 있으면 가장 가까운 구간, 시간이 없으면 "늦게 출근"은 "오전1", "일찍 퇴근"은 "오후2"로 한다.
   * 그 외 type: null
4. time은 반차·반반차이면서 메일에 시간이 적혀 있을 때만 "HH:MM-HH:MM" 형식으로 쓰고, 그 외에는 null이다.
5. start, end는 "YYYY-MM-DD" 형식이다. "내일", "다음 주 월요일", "10/29"처럼 쓴 날짜는 메일을 받은 날짜 기준으로 실제 날짜로 바꾼다(연도가 없으면 수신한 해). 하루짜리면 start와 end를 같게 한다.
6. 같은 사람의 같은 날짜에 메일이 여러 개여도 합치거나 지우지 말고 메일마다 레코드를 따로 만든다. 어느 것이 유효한지는 서비스가 receivedAt으로 가린다.
7. note는 원래 사유나 참고 내용(예: "병가", "10시 출근")이고, 없으면 null이다.
8. receivedAt은 메일을 받은 일시이며 ISO 8601 형식이다(예: "2026-10-27T17:42:00+09:00"). 받은 시각을 알 수 없는 메일은 레코드를 만들지 않는다.
9. 확실하지 않은 내용은 추측하지 말고 note 끝에 "확인 필요"를 붙인다(예: "외부 교육 확인 필요").
10. 아래 출력 형식의 예시 레코드는 형식을 보여 주는 것일 뿐이다. 예시 이름이나 내용을 결과에 넣지 않는다. 근태 메일이 없으면 records를 빈 배열로 둔다.

[출력 형식]
{
  "generatedAt": "정리한 일시 (ISO 8601)",
  "rangeStart": "${start}",
  "rangeEnd": "${end}",
  "records": [
    { "name": "홍길동", "type": "휴가", "start": "2026-10-29", "end": "2026-10-30", "period": null, "time": null, "note": "병가", "receivedAt": "2026-10-27T17:42:00+09:00" },
    { "name": "김영희", "type": "반반차", "start": "2026-10-29", "end": "2026-10-29", "period": "오후2", "time": "16:00-18:00", "note": null, "receivedAt": "2026-10-28T09:10:00+09:00" },
    { "name": "이철수", "type": "건강검진", "start": "2026-10-30", "end": "2026-10-30", "period": null, "time": null, "note": null, "receivedAt": "2026-10-28T14:05:00+09:00" }
  ]
}
`;
}
