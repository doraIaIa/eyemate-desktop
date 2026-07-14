import { app } from "electron";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderLocalPdf } from "../../dist/platform-electron/pdf-export.js";
import { writeLocalPdfExport } from "../../dist/platform-electron/local-export.js";

app.disableHardwareAcceleration();
const watchdog = setTimeout(() => { console.error("PDF_EXPORT_PROCESS_TIMEOUT"); app.exit(1); }, 25_000);

app.whenReady().then(async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "eyemate-pdf-integration-"));
  try {
    const unicodeSummary = `Tóm tắt sức khỏe thị giác cục bộ\n${"Một dòng dữ liệu tổng hợp có dấu tiếng Việt.\n".repeat(220)}Không phải chẩn đoán.`;
    const pdf = await renderLocalPdf(unicodeSummary);
    const destination = path.join(directory, "summary.pdf");
    const result = writeLocalPdfExport(destination, pdf);
    if (result.status !== "EXPORTED") throw new Error(`PDF_WRITE_FAILED:${result.reason}`);
    const saved = await readFile(destination);
    const pageCount = (saved.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
    if (saved.subarray(0, 5).toString("ascii") !== "%PDF-" || pageCount < 2) throw new Error(`PDF_ACCEPTANCE_INVALID:pages=${pageCount}`);
    if (writeLocalPdfExport("", pdf).status !== "CANCELLED") throw new Error("PDF_CANCEL_INVALID");
    console.log(`PDF_EXPORT_INTEGRATION_PASS pages=${pageCount} unicode=RENDERED destination=LOCAL_ONLY`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    clearTimeout(watchdog);
    await rm(directory, { recursive: true, force: true });
    app.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "PDF_EXPORT_INTEGRATION_FAILED");
    clearTimeout(watchdog);
    await rm(directory, { recursive: true, force: true });
    app.exit(1);
  }
}).catch((error) => {
  console.error(error instanceof Error ? error.message : "PDF_EXPORT_BOOT_FAILED");
  clearTimeout(watchdog);
  app.exit(1);
});
