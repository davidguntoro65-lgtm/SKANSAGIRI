import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { motion } from "motion/react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_AT_KEY = "smkn1_install_prompt_dismissed_at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function getMobilePlatform() {
  const userAgent = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  return { isMobile: isIOS || isAndroid, isIOS, isAndroid };
}

function isRunningInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY));
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export default function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const platform = getMobilePlatform();
    if (!platform.isMobile || isRunningInstalled() || wasRecentlyDismissed()) return;

    setIsIOS(platform.isIOS);
    setIsAndroid(platform.isAndroid);

    const timer = window.setTimeout(() => setVisible(true), 1800);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      // Keep the prompt dismissible even if browser storage is unavailable.
    }
    setVisible(false);
  };

  const installOrShowInstructions = async () => {
    if (!installEvent) {
      setInstructionsOpen((open) => !open);
      return;
    }

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === "accepted") setVisible(false);
      else dismiss();
    } catch {
      setInstallEvent(null);
      setInstructionsOpen(true);
    }
  };

  if (!visible) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      aria-label="Tawaran instal aplikasi"
      aria-live="polite"
      className="fixed left-4 right-4 top-20 z-[120] mx-auto max-w-md rounded-2xl border border-amber-400/30 bg-slate-950/95 p-4 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:left-auto sm:right-6 sm:top-24"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
          <Smartphone className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="pr-7 text-sm font-black">Pasang aplikasi SMKN 1 Wonogiri</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Buka dari layar utama agar akses informasi dan E-Voting lebih cepat.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup tawaran instal aplikasi"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {instructionsOpen && (
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-slate-200">
          {isIOS
            ? "Di Safari, ketuk Bagikan lalu pilih “Tambahkan ke Layar Utama”."
            : isAndroid
              ? "Buka menu browser ⋮ lalu pilih “Instal aplikasi” atau “Tambahkan ke layar utama”."
              : "Buka menu browser lalu pilih “Tambahkan ke layar utama” atau “Instal aplikasi”."}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={installOrShowInstructions}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {installEvent ? "Pasang aplikasi" : instructionsOpen ? "Sembunyikan cara pasang" : "Cara memasang"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          Nanti
        </button>
      </div>
    </motion.aside>
  );
}
