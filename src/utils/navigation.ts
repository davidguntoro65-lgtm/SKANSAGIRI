export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export function navigate(path: string) {
  const full = path === "/" ? BASE_PATH || "/" : BASE_PATH + path;
  window.history.pushState({}, "", full);
  window.dispatchEvent(new Event("popstate"));
}

export function getAppPath(): string {
  const raw = window.location.pathname;
  if (!BASE_PATH) return raw;
  if (raw === BASE_PATH) return "/";
  if (raw.startsWith(BASE_PATH + "/")) return raw.slice(BASE_PATH.length);
  return raw;
}
