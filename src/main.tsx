import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Auto-prefix /api/ calls with the Vite base path (e.g. /id/ on cPanel production).
// In dev, BASE_URL is "/" so the prefix becomes "" and nothing changes.
(function patchFetch() {
  const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (!BASE) return;
  const _fetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return _fetch(BASE + input, init);
    }
    return _fetch(input, init);
  };
}());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for PWA / offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swBase = import.meta.env.BASE_URL;
    navigator.serviceWorker
      .register(`${swBase}sw.js`, { scope: swBase })
      .catch(() => {});
  });
}
