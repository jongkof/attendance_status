import type { CaptureCell, CaptureTable } from "./types";

/** 화면의 라이트·다크와 상관없이 흰 배경에 같은 색을 쓴다. 색은 globals.css의 라이트 값에 가깝게 맞춘 고정값이다. */
export const CAPTURE_COLOR = {
  background: "#ffffff",
  text: "#171717",
  muted: "#737373",
  holidayText: "#dc2626",
  line: "#e5e5e5",
  strong: "rgba(23,23,23,0.28)",
  holidayFill: "#e4e4e7",
  stripFill: "#f7f7f7",
  groupTones: ["#fcf9ee", "#f4f7fd"],
  remoteFill: "#fbe08a",
  remoteText: "#6b4f10",
  interviewFlag: "#8b3fe0",
  interviewFill: "#e6d8f7",
  cellBorder: "#d4d4d4",
} as const;

/** 메일에서 또렷하게 보이도록 캔버스를 2배로 만든다. */
export const SCALE = 2;
const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

const PAD = 20;
const TITLE_H = 44;
const STRIP_W = 30;
const NAME_W = 84;
const DAY_W = 38;
const CELL = 20;
const ROW_H = 24;
const BANNER_H = 18;
const LEGEND_H = 44;

const hasHoliday = (table: CaptureTable) => table.days.some((day) => day.holiday);
const headerHeight = (table: CaptureTable) => 34 + (hasHoliday(table) ? 14 : 0);
const rowCount = (table: CaptureTable) => table.blocks.reduce((sum, block) => sum + block.rows.length, 0);
const hasBanner = (table: CaptureTable) => (table.bannerWeeks?.length ?? 0) > 0;

/** 이미지의 크기(CSS 픽셀). 캔버스는 여기에 SCALE을 곱해 만든다. */
export function tableSize(table: CaptureTable) {
  const width = PAD * 2 + STRIP_W + NAME_W + table.days.length * DAY_W;
  const height =
    PAD + TITLE_H + (hasBanner(table) ? BANNER_H : 0) + headerHeight(table) + rowCount(table) * ROW_H + LEGEND_H + PAD;
  return { width, height };
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

function squarePath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + size, y, x + size, y + size, radius);
  ctx.arcTo(x + size, y + size, x, y + size, radius);
  ctx.arcTo(x, y + size, x, y, radius);
  ctx.arcTo(x, y, x + size, y, radius);
  ctx.closePath();
}

function drawCell(ctx: CanvasRenderingContext2D, cell: CaptureCell, x: number, y: number, size: number) {
  ctx.save();
  if (cell.faded) ctx.globalAlpha = 0.4;
  squarePath(ctx, x, y, size, 3);
  if (cell.fill) {
    ctx.fillStyle = cell.fill;
    ctx.fill();
  }
  if (cell.stroke) {
    ctx.strokeStyle = cell.stroke;
    ctx.lineWidth = 1;
    if (cell.faded) ctx.setLineDash([1, 2]);
    ctx.stroke();
  }
  ctx.restore();
  if (cell.flag) {
    ctx.fillStyle = CAPTURE_COLOR.interviewFlag;
    ctx.beginPath();
    ctx.moveTo(x + size - 9, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size, y + 9);
    ctx.closePath();
    ctx.fill();
  }
  if (cell.text) {
    ctx.fillStyle = cell.textColor ?? CAPTURE_COLOR.text;
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cell.text, x + size / 2, y + size / 2 + 0.5);
  }
}

/** 표 전체를 (0,0)부터 tableSize 크기로 그린다. 호출하는 쪽이 SCALE을 미리 곱해 둔다. */
export function drawTable(ctx: CanvasRenderingContext2D, table: CaptureTable) {
  const { width, height } = tableSize(table);
  const { days } = table;
  const left = PAD;
  const nameX = left + STRIP_W;
  const dayX = (index: number) => nameX + NAME_W + index * DAY_W;
  const right = dayX(days.length);

  ctx.fillStyle = CAPTURE_COLOR.background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = CAPTURE_COLOR.text;
  ctx.font = `700 18px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(table.title, left, PAD + TITLE_H / 2);

  let y = PAD + TITLE_H;
  const headTop = y;

  if (hasBanner(table)) {
    ctx.fillStyle = CAPTURE_COLOR.muted;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const { first, count } of table.bannerWeeks ?? []) {
      ctx.fillText(fit(ctx, table.bannerText ?? "", count * DAY_W - 4), dayX(first) + (count * DAY_W) / 2, y + BANNER_H / 2);
    }
    y += BANNER_H;
  }

  // 날짜 머리글: 날짜, 요일, 휴일 이름
  const head = headerHeight(table);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = CAPTURE_COLOR.text;
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText("이름", nameX + NAME_W / 2, y + 17);
  days.forEach((day, index) => {
    const center = dayX(index) + DAY_W / 2;
    ctx.fillStyle = day.holiday ? CAPTURE_COLOR.holidayText : CAPTURE_COLOR.text;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText(String(day.day), center, y + 11);
    ctx.fillStyle = day.holiday ? CAPTURE_COLOR.holidayText : CAPTURE_COLOR.muted;
    ctx.font = `10px ${FONT}`;
    ctx.fillText(day.weekday, center, y + 24);
    if (day.holiday) {
      ctx.fillStyle = CAPTURE_COLOR.holidayText;
      ctx.font = `9px ${FONT}`;
      ctx.fillText(fit(ctx, day.holiday, DAY_W - 2), center, y + 37);
    }
  });
  y += head;

  const bodyTop = y;
  let groupIndex = 0;
  for (const block of table.blocks) {
    const blockHeight = block.rows.length * ROW_H;
    ctx.fillStyle = block.name === null ? CAPTURE_COLOR.background : CAPTURE_COLOR.groupTones[groupIndex++ % 2];
    ctx.fillRect(left, y, right - left, blockHeight);
    ctx.fillStyle = CAPTURE_COLOR.stripFill;
    ctx.fillRect(left, y, STRIP_W, blockHeight);

    if (block.name) {
      // 조 이름은 세로쓰기처럼 글자를 위에서 아래로 쌓는다. 칸이 모자라면 글자를 줄인다.
      const chars = [...block.name];
      const line = Math.max(Math.min(12, Math.floor((blockHeight - 4) / chars.length)), 7);
      ctx.fillStyle = CAPTURE_COLOR.text;
      ctx.font = `600 ${line}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const first = y + (blockHeight - line * chars.length) / 2 + line / 2;
      chars.forEach((char, index) => ctx.fillText(char, left + STRIP_W / 2, first + index * line));
    }

    block.rows.forEach((row, rowIndex) => {
      const rowY = y + rowIndex * ROW_H;
      if (rowIndex > 0) {
        ctx.fillStyle = CAPTURE_COLOR.line;
        ctx.fillRect(nameX, rowY, right - nameX, 1);
      }
      ctx.fillStyle = CAPTURE_COLOR.text;
      ctx.font = `600 12px ${FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(fit(ctx, row.name, NAME_W - 10), nameX + 6, rowY + ROW_H / 2 + 0.5);
      row.cells.forEach((cell, index) => {
        drawCell(ctx, cell, dayX(index) + (DAY_W - CELL) / 2, rowY + (ROW_H - CELL) / 2, CELL);
      });
    });

    // 조 경계선과 조 띠 오른쪽 선
    ctx.fillStyle = CAPTURE_COLOR.strong;
    ctx.fillRect(left, y, right - left, 2);
    ctx.fillStyle = CAPTURE_COLOR.line;
    ctx.fillRect(left + STRIP_W - 1, y, 1, blockHeight);
    y += blockHeight;
  }
  ctx.fillStyle = CAPTURE_COLOR.line;
  ctx.fillRect(left, y, right - left, 1);
  const bodyBottom = y;

  // 머리글 아래 선과 주 경계선
  ctx.fillRect(left, bodyTop - 1, right - left, 1);
  ctx.fillStyle = CAPTURE_COLOR.strong;
  days.forEach((day, index) => {
    if (day.weekStart) ctx.fillRect(dayX(index) - 1, headTop, 2, bodyBottom - headTop);
  });

  // 범례
  let legendX = left;
  const legendY = bodyBottom + LEGEND_H / 2 + 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `11px ${FONT}`;
  for (const item of table.legend) {
    if (item.cell) drawCell(ctx, { ...item.cell, text: undefined }, legendX, legendY - 6, 12);
    ctx.fillStyle = CAPTURE_COLOR.muted;
    ctx.fillText(item.label, legendX + 18, legendY);
    legendX += 18 + ctx.measureText(item.label).width + 20;
  }
}

/** 표를 PNG 이미지로 만든다. 브라우저에서만 쓴다. */
export function renderTableImage(table: CaptureTable): Promise<Blob> {
  const { width, height } = tableSize(table);
  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas unavailable"));
  ctx.scale(SCALE, SCALE);
  drawTable(ctx, table);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png failed"))), "image/png"),
  );
}
