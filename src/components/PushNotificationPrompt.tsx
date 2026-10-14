import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { motion } from "motion/react";
import { apiPath } from "../utils/navigation";

const DISMISSED_AT_KEY = "smkn1_push_prompt_dismissed_at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

type PushSubscriptionJson = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

function isInstalledOnMobile() {
  const userAgent = navigator.userAgent;
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isInstalled =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isMobile && isInstalled;
}

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY));
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function decodeVapidKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function saveSubscription(subscription: PushSubscriptionJson) {
  const response = await fetch(apiPath("/api/push/subscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
  if (!response.ok) throw new Error("Gagal menyimpan langganan notifikasi.");
}

export default function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (
      !isInstalledOnMobile() ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return;
    }

    let cancelled = false;
    const showPrompt = () => {
      if (!cancelled && !wasRecentlyDismissed()) setVisible(true);
    };

    const checkCurrentSubscription = async () => {
      if (Notification.permission === "denied") {
        if (!cancelled) {
          setPermissionDenied(true);
          setMessage("Izin notifikasi diblokir. Ubah izin situs dari pengaturan browser atau perangkat.");
          showPrompt();
        }
        return;
      }

      if (Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await saveSubscription(subscription.toJSON());
          return;
        }
      }

      showPrompt();
    };

    const timer = window.setTimeout(() => {
      void checkCurrentSubscription().catch(() => showPrompt());
    }, 3500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      // Keep the prompt dismissible when local storage is unavailable.
    }
    setVisible(false);
  };

  const enableNotifications = async () => {
    setBusy(true);
    setMessage("");
    try {
      const keyResponse = await fetch(apiPath("/api/push/vapid-public-key"));
      if (!keyResponse.ok) {
        throw new Error("Notifikasi belum disiapkan di server. Silakan coba lagi nanti.");
      }
      const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
      if (!publicKey) throw new Error("Kunci notifikasi belum tersedia.");

      let permission = Notification.permission;
      if (permission !== "granted") permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPermissionDenied(permission === "denied");
        setMessage(
          permission === "denied"
            ? "Izin notifikasi ditolak. Aktifkan dari pengaturan browser atau perangkat."
            : "Izin notifikasi belum diberikan.",
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(publicKey) as BufferSource,
        });
      }

      await saveSubscription(subscription.toJSON());
      setVisible(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Notifikasi belum dapat diaktifkan. Periksa koneksi lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Aktifkan notifikasi sekolah"
      aria-live="polite"
      className="fixed left-4 right-4 top-20 z-[115] mx-auto max-w-md rounded-2xl border border-sky-400/25 bg-slate-950/95 p-4 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:left-auto sm:right-6 sm:top-24"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="pr-7 text-sm font-black">Aktifkan notifikasi sekolah</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Terima warta, agenda, prestasi, dan pembaruan baru meski aplikasi tidak dibuka.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup tawaran notifikasi"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {message && (
        <p role="status" className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-amber-200">
          {message}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        {!permissionDenied && (
          <button
            type="button"
            onClick={enableNotifications}
            disabled={busy}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {busy ? "Mengaktifkan..." : "Aktifkan notifikasi"}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          {permissionDenied ? "Tutup" : "Nanti"}
        </button>
      </div>
    </motion.aside>
  );
}
