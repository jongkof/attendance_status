/** 이미지를 클립보드에 넣는다. 만드는 일을 ClipboardItem에 약속(Promise)으로 넘겨, 막히면 아무것도 들어가지 않는다. */
export async function copyImage(makeBlob: () => Promise<Blob>): Promise<void> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error("clipboard unsupported");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": makeBlob() })]);
}

/** 이미지를 PNG 파일로 내려받는다. */
export function saveImage(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
