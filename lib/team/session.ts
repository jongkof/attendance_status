/** 팀 로그인 유지 시간: 30일 */
export const TEAM_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** 로그인 뒤에 이동할 주소. 현황표(`/`)와 `?month=YYYY-MM`만 허용하고 나머지는 현황표로 돌린다. */
export function safeTeamNextPath(next: string | undefined): string {
  if (next && /^\/\?month=\d{4}-\d{2}$/.test(next)) return next;
  return "/";
}

/** 새 팀 비밀번호가 규칙을 어기면 이유를, 지키면 null을 돌려준다. */
export function checkNewTeamPassword(input: {
  next: string;
  confirm: string;
  minLength: number;
  sameAsAdmin: boolean;
}): string | null {
  if (input.next.length < input.minLength) return `새 팀 비밀번호는 ${input.minLength}자 이상이어야 합니다.`;
  if (input.next !== input.confirm) return "새 팀 비밀번호와 확인 입력이 일치하지 않습니다.";
  if (input.sameAsAdmin) return "팀 비밀번호는 관리자 비밀번호와 달라야 합니다.";
  return null;
}
