/**
 * 표 안에서 data-focus-day가 붙은 날짜 열이 보이도록 가로 스크롤한다. 이름 열이 고정되어 있어
 * 그 뒤에 가려지지 않게 맞춘다. onlyIfHidden이면 이미 보일 때는 위치를 바꾸지 않는다.
 */
export function scrollToToday(root: ParentNode = document, { onlyIfHidden = false } = {}) {
  const head = root.querySelector<HTMLElement>("[data-focus-day]");
  const container = head?.closest<HTMLElement>('[data-slot="table-container"]');
  if (!head || !container) return;
  const frame = container.getBoundingClientRect();
  const stickyRight = container.querySelector<HTMLElement>("[data-name-head]")?.getBoundingClientRect().right ?? frame.left;
  const cell = head.getBoundingClientRect();
  if (onlyIfHidden && cell.left >= stickyRight && cell.right <= frame.right) return;
  const left = container.scrollLeft + (cell.left - stickyRight) - cell.width;
  container.scrollTo({ left: Math.max(0, left) });
}
