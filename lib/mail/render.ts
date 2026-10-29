import type { MailSection, MailSummary } from "./types";

const FONT = "'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif";

/** 메일 본문에 들어가는 모든 글자는 HTML로 해석되지 않도록 바꿔서 넣는다. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Content = {
  title: string;
  events: readonly string[];
  summary: MailSummary;
  sections: readonly MailSection[];
  afternoonHalf: number;
  linkUrl: string;
};

/** 집계 칸의 색. 메일 프로그램이 다크 모드나 외부 스타일을 알지 못하므로 값을 그대로 적는다. */
const BOX = {
  present: { label: "출근", background: "#E6F4EA", color: "#1E6B3A", border: "none" },
  remote: { label: "리모트", background: "#FFF4D6", color: "#7A5A00", border: "none" },
  absent: { label: "부재", background: "#FDE8E8", color: "#A32D2D", border: "none" },
  morningHalf: { label: "오전 반차", background: "#FBE6F0", color: "#8A2552", border: "none" },
  unconfirmed: { label: "미확인", background: "#FFFFFF", color: "#444444", border: "1px dashed #888888" },
} as const;

const SECTION_COLOR: Record<MailSection["id"], string> = {
  unconfirmed: "#444444",
  absent: "#A32D2D",
  remote: "#7A5A00",
  "morning-half": "#8A2552",
  "afternoon-half": "#666666",
};

const MUTED = "#666666";

function peopleHtml(people: MailSection["groups"][number]["people"]): string {
  return people
    .map((person) =>
      person.suffix
        ? `${escapeHtml(person.name)} <span style="color:${MUTED};">${escapeHtml(person.suffix)}</span>`
        : escapeHtml(person.name),
    )
    .join(", ");
}

function sectionHtml(section: MailSection): string {
  const rows = section.groups
    .map((group) =>
      group.label
        ? `<tr><td valign="top" style="width:64px;padding:2px 0;color:${MUTED};">${escapeHtml(group.label)}</td><td style="padding:2px 0;">${peopleHtml(group.people)}</td></tr>`
        : `<tr><td colspan="2" style="padding:2px 0;">${peopleHtml(group.people)}</td></tr>`,
    )
    .join("");
  const note =
    section.id === "unconfirmed"
      ? `<tr><td colspan="2" style="padding:2px 0;color:${MUTED};">공지와 연락이 없어 확인 중입니다.</td></tr>`
      : "";
  return (
    `<div style="margin:0 0 14px;">` +
    `<div style="font-size:13px;font-weight:bold;color:${SECTION_COLOR[section.id]};margin:0 0 4px;">${escapeHtml(section.title)}</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}${note}</table>` +
    `</div>`
  );
}

function remainderLine(present: number, afternoonHalf: number): string {
  return `나머지 ${present}명은 출근입니다${afternoonHalf > 0 ? `(오후 반차 ${afternoonHalf}명 포함)` : ""}`;
}

function linkHtml(linkUrl: string): string {
  return `<div style="margin:6px 0 0;"><a href="${escapeHtml(linkUrl)}" style="color:#1A56DB;font-size:14px;">전체 현황 보기 →</a></div>`;
}

function wrap(inner: string): string {
  return `<div style="font-family:${FONT};font-size:14px;color:#222222;max-width:640px;">${inner}</div>`;
}

export function renderWorkdayHtml(content: Content): string {
  const events = content.events.length
    ? `<div style="margin:0 0 12px;color:#444444;">오늘 행사: ${content.events.map(escapeHtml).join(", ")}</div>`
    : "";
  const values: [keyof typeof BOX, number][] = [
    ["present", content.summary.present],
    ["remote", content.summary.remote],
    ["absent", content.summary.absent],
    ["morningHalf", content.summary.morningHalf],
    ["unconfirmed", content.summary.unconfirmed],
  ];
  const boxes = values
    .map(([key, count]) => {
      const box = BOX[key];
      return (
        `<td align="center" width="20%" style="width:20%;background:${box.background};border:${box.border};border-radius:6px;padding:8px 4px;">` +
        `<div style="font-size:12px;color:${box.color};">${box.label}</div>` +
        `<div style="font-size:20px;font-weight:bold;color:${box.color};">${count}</div></td>`
      );
    })
    .join("");
  return wrap(
    `<div style="font-size:18px;font-weight:bold;margin:0 0 12px;">${escapeHtml(content.title)}</div>` +
      events +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="border-collapse:separate;margin:0 0 12px;"><tr>${boxes}</tr></table>` +
      content.sections.map(sectionHtml).join("") +
      `<div style="border-top:1px solid #DDDDDD;padding-top:10px;color:${MUTED};font-size:13px;">${escapeHtml(remainderLine(content.summary.present, content.afternoonHalf))}</div>` +
      linkHtml(content.linkUrl),
  );
}

export function renderHolidayHtml(title: string, holiday: string, linkUrl: string): string {
  return wrap(
    `<div style="font-size:18px;font-weight:bold;margin:0 0 12px;">${escapeHtml(title)}</div>` +
      `<div style="margin:0 0 12px;">오늘은 쉬는 날입니다(${escapeHtml(holiday)})</div>` +
      linkHtml(linkUrl),
  );
}

function sectionText(section: MailSection): string[] {
  const lines = [section.title];
  for (const group of section.groups) {
    const names = group.people.map((person) => (person.suffix ? `${person.name} ${person.suffix}` : person.name)).join(", ");
    lines.push(group.label ? `  ${group.label}: ${names}` : `  ${names}`);
  }
  return lines;
}

export function renderWorkdayText(content: Content): string {
  const { summary } = content;
  return [
    content.title,
    ...(content.events.length ? [`오늘 행사: ${content.events.join(", ")}`] : []),
    `집계: 출근 ${summary.present} · 리모트 ${summary.remote} · 부재 ${summary.absent} · 오전 반차 ${summary.morningHalf} · 미확인 ${summary.unconfirmed}`,
    "",
    ...content.sections.flatMap((section) => [...sectionText(section), ""]),
    `${remainderLine(summary.present, content.afternoonHalf)}.`,
    `전체 현황 보기: ${content.linkUrl}`,
  ].join("\n");
}

export function renderHolidayText(title: string, holiday: string, linkUrl: string): string {
  return [title, `오늘은 쉬는 날입니다(${holiday})`, `전체 현황 보기: ${linkUrl}`].join("\n");
}
