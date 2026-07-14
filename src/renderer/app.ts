import "../shared/renderer-globals.js";
import { getScreen, screenIds, type ScreenId } from "../app-shell/navigation.js";

const statusElement = document.querySelector<HTMLParagraphElement>("#runtime-status");
const pageTitleElement = document.querySelector<HTMLHeadingElement>("#page-title");
const pageBodyElement = document.querySelector<HTMLParagraphElement>("#page-body");
const pageStateElement = document.querySelector<HTMLParagraphElement>("#page-state");

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

function renderScreen(screenId: ScreenId): void {
  const screen = getScreen(screenId);
  if (pageTitleElement !== null) pageTitleElement.textContent = screen.title;
  if (pageBodyElement !== null) pageBodyElement.textContent = screen.body;
  if (pageStateElement !== null) pageStateElement.textContent = `Trạng thái: ${screen.state.replaceAll("_", " ")}`;

  for (const navigationButton of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-screen]"))) {
    const selected = navigationButton.dataset.screen === screen.id;
    navigationButton.setAttribute("aria-current", selected ? "page" : "false");
  }
}

for (const navigationButton of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-screen]"))) {
  navigationButton.addEventListener("click", () => {
    const requestedScreen = navigationButton.dataset.screen;
    if (requestedScreen !== undefined && (screenIds as readonly string[]).includes(requestedScreen)) {
      renderScreen(requestedScreen as ScreenId);
    }
  });
}

renderScreen("home");
