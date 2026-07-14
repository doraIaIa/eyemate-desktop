import type { EyeMatePreloadApi } from "./preload-contract.js";

declare global {
  interface Window {
    eyeMate: EyeMatePreloadApi;
  }
}

export {};
