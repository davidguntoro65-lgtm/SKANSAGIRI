import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Detect the app base path at RUNTIME from this script's own URL.
// Works regardless of build configuration or NODE_ENV on any server.
// Production at /id/: import.meta.url pathname = "/id/assets/index-xxx.js" → BASE = "/id"
// Dev / Replit:       import.meta.url pathname = "/src/main.tsx" → no match → BASE = ""
const _scriptPath = new URL(import.meta.url).pathname;
const _baseMatch = _scriptPath.match(/^(.*?)\/assets\//);
const BASE = _baseMatch ? _baseMatch[1] : (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

// Patch window.fetch to prefix all /api/ calls with the detected base path.
// This ensures fetch("/api/competencies") becomes fetch("/id/api/competencies") on cPanel.
if (BASE) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return _fetch(BASE + input, init);
    }
    return _fetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for PWA / offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swBase = BASE ? BASE + "/" : "/";
    navigator.serviceWorker
      .register(`${swBase}sw.js`, { scope: swBase })
      .catch(() => {});
  });
}
