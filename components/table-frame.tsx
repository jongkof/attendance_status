"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { scrollToToday } from "@/components/scroll-to-today";

/**
 * 표를 감싸 두 가지를 맡는다. 처음 열 때 오늘 열이 보이게 가로 스크롤하고(focusDay가 있을 때만),
 * 칸에 마우스를 올리면 그 행의 이름 칸과 그 열의 날짜 머리글, 행에 data-hover를 붙인다.
 * 강조 모양은 globals.css가 정한다. 표는 data-day가 붙은 본문 칸과 머리글을 가진 모양이면 된다.
 */
export function TableFrame({ focusDay, children }: { focusDay?: string | null; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusDay && root.current) scrollToToday(root.current, { onlyIfHidden: true });
  }, [focusDay]);

  function clear() {
    root.current?.querySelectorAll("[data-hover]").forEach((element) => element.removeAttribute("data-hover"));
  }

  function highlight(event: React.MouseEvent) {
    const cell = (event.target as Element).closest<HTMLElement>("tbody td[data-day]");
    const row = cell?.closest("tr");
    clear();
    if (!cell || !row) return;
    row.setAttribute("data-hover", "");
    row.querySelector('th[scope="row"]')?.setAttribute("data-hover", "");
    root.current?.querySelector(`thead th[data-day="${cell.dataset.day}"]`)?.setAttribute("data-hover", "");
  }

  return (
    <div ref={root} onMouseOver={highlight} onMouseLeave={clear}>
      {children}
    </div>
  );
}
