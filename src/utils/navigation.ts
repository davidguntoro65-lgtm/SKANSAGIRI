// Detect the app's base path at RUNTIME from the script URL.
// This is reliable regardless of build-time NODE_ENV or VITE_BASE_PATH settings.
// Production at /id/: import.meta.url = "https://domain.com/id/assets/index-xxx.js"
//                     → detects BASE_PATH = "/id"
// Dev / Replit:       import.meta.url = "http://localhost:5000/src/utils/navigation.ts"
//                     → no /assets/ match → falls back to BASE_URL → ""
function detectBase(): string {
  const path = new URL(import.meta.url).pathname;
  const match = path.match(/^(.*?)\/assets\//);
  if (match) return match[1]; // e.g. "/id" or ""
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export const BASE_PATH = detectBase();

function normalizePath(path: string): string {
  if (path.length <= 1) return "/";
  return path.replace(/\/+$/, "");
}

export function navigate(path: string) {
  const full = path === "/" ? BASE_PATH || "/" : BASE_PATH + path;
  window.history.pushState({}, "", full);
  window.dispatchEvent(new Event("popstate"));
}

export function getAppPath(): string {
  const raw = normalizePath(window.location.pathname);
  const base = normalizePath(BASE_PATH || "/");
  if (base === "/") return raw;
  if (raw === base) return "/";
  if (raw.startsWith(base + "/")) return normalizePath(raw.slice(base.length));
  return raw;
}
