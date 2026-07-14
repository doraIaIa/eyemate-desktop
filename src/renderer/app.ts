import "../shared/renderer-globals.js";

const statusElement = document.querySelector<HTMLParagraphElement>("#runtime-status");

async function renderRuntimeStatus(): Promise<void> {
  if (statusElement === null) {
    return;
  }

  try {
    const runtime = await window.eyeMate.getRuntimeInfo();
    statusElement.textContent = `Chế độ ${runtime.mode.replaceAll("_", " ")} — phiên bản ${runtime.applicationVersion}`;
  } catch {
    statusElement.textContent = "Không thể xác minh trạng thái ứng dụng cục bộ.";
  }
}

void renderRuntimeStatus();
