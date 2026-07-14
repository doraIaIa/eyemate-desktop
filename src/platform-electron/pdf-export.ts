import { BrowserWindow } from "electron";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function renderLocalPdf(summary: string): Promise<Buffer> {
  if (typeof summary !== "string" || summary.length === 0 || summary.length > 500_000) throw new Error("INVALID_PDF_SUMMARY");
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  try {
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, target) => { if (!target.startsWith("data:text/html")) event.preventDefault(); });
    const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#162438;font-size:11pt;line-height:1.55}h1{color:#0F1C2E;font-size:20pt;margin:0 0 5mm}p.meta{color:#3D5C7A;font-size:9pt;border-bottom:1px solid #d8e6f2;padding-bottom:4mm}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:8mm;color:#3D5C7A;font-size:8.5pt}</style></head><body><h1>EyeMate Personal Summary</h1><p class="meta">Bản xuất cục bộ · không tự động gửi dữ liệu</p><pre>${escapeHtml(summary)}</pre><footer>Thông tin wellness cá nhân; không phải chẩn đoán hoặc hồ sơ y tế.</footer></body></html>`;
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await window.webContents.printToPDF({ printBackground: true, pageSize: "A4", margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 } });
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("PDF_RENDER_INVALID");
    return pdf;
  } finally { window.destroy(); }
}
