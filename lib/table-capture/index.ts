// 표를 이미지로 만들고 복사·저장하는 공개 API. 이미지 만들기와 복사·저장은 브라우저에서만 쓴다.
export { drawTable, renderTableImage, tableSize } from "./draw";
export { interviewCaptureTable, remoteCaptureTable } from "./models";
export { copyImage, saveImage } from "./output";
export type * from "./types";
