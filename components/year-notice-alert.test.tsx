import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { YearNoticeAlert } from "./year-notice-alert";

describe("YearNoticeAlert", () => {
  it("알릴 것이 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<YearNoticeAlert notices={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("미등록 연도 문구를 보이고 단계는 접어 둔다", () => {
    render(<YearNoticeAlert notices={[{ kind: "viewed", year: 2031 }]} />);
    expect(screen.getByText("2031년 공휴일이 아직 등록되지 않아 공휴일이 출근으로 보일 수 있습니다.")).toBeInTheDocument();
    expect(screen.queryByText(/방법 1/)).not.toBeInTheDocument();
  });

  it("내년 안내 문구를 보인다", () => {
    render(<YearNoticeAlert notices={[{ kind: "next", year: 2031 }]} />);
    expect(screen.getByText("내년 공휴일이 아직 등록되지 않았습니다.")).toBeInTheDocument();
  });

  it("등록 방법 보기를 누르면 두 방법의 번호 단계가 펼쳐지고 다시 누르면 접힌다", () => {
    render(<YearNoticeAlert notices={[{ kind: "viewed", year: 2031 }]} />);
    fireEvent.click(screen.getByRole("button", { name: "등록 방법 보기" }));
    expect(screen.getByText(/방법 1/)).toBeInTheDocument();
    expect(screen.getByText(/방법 2/)).toBeInTheDocument();
    for (const text of [/개발 담당자에게 2031년 공휴일 SQL 파일/, /Supabase 대시보드/, /SQL Editor/, /New query/, /Run을 누릅니다/, /Success/, /달력 편집 화면을 새로 고쳐/, /두 번 실행해도/, /오류 문구/]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "등록 방법 접기" }));
    expect(screen.queryByText(/방법 1/)).not.toBeInTheDocument();
  });
});
