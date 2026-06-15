import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Bell, ArrowRight, Newspaper } from "lucide-react";
import { DataStore, getStoredData, STORAGE_KEYS } from "../dataStore";
import { NewsArticle } from "../data";
import { navigate } from "../utils/navigation";

const SEEN_KEY = "smkn1_seen_article_ids";

function getSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = localStorage.getItem(SEEN_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>): void {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

function isFirstEverVisit(): boolean {
  return localStorage.getItem(SEEN_KEY) === null;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function WhatsNewNotification() {
  const [unseen, setUnseen] = useState<NewsArticle[]>([]);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(() => {
    const all: NewsArticle[] = getStoredData<NewsArticle[]>(
      STORAGE_KEYS.NEWS,
      DataStore.getNews()
    );

    if (isFirstEverVisit()) {
      // Brand-new visitor: silently mark everything as seen — no popup
      saveSeenIds(new Set(all.map((a) => a.id)));
      return;
    }

    const seen = getSeenIds();
    const fresh = all.filter((a) => !seen.has(a.id));
    if (fresh.length > 0) {
      setUnseen(fresh.slice(0, 5));
    }
  }, []);

  // Run after DataStore syncs from server
  useEffect(() => {
    const onUpdate = () => check();
    window.addEventListener("data-store-updated", onUpdate);

    // Initial check after a short delay so the page settles first
    const timer = setTimeout(() => check(), 2500);

    return () => {
      window.removeEventListener("data-store-updated", onUpdate);
      clearTimeout(timer);
    };
  }, [check]);

  // Show popup once we have unseen articles (and haven't dismissed yet)
  useEffect(() => {
    if (unseen.length > 0 && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [unseen, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    // Mark all currently shown articles as seen
    const seen = getSeenIds();
    unseen.forEach((a) => seen.add(a.id));
    saveSeenIds(seen);
  };

  const handleViewAll = () => {
    handleDismiss();
    navigate("/berita");
  };

  const handleArticleClick = (article: NewsArticle) => {
    handleDismiss();
    navigate("/berita");
    // Small delay so nav completes, then try to scroll/highlight
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("open-article", { detail: { id: article.id } })
      );
    }, 150);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop (mobile only) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/30 md:hidden"
            onClick={handleDismiss}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-6 right-4 md:right-6 z-[9999] w-[calc(100vw-2rem)] max-w-sm"
          >
            <div className="rounded-2xl shadow-2xl overflow-hidden border border-amber-500/20 bg-slate-900">

              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-amber-500/15">
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 flex-shrink-0">
                  <Bell className="h-4 w-4 text-amber-400" />
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">
                    {unseen.length === 1
                      ? "1 Berita Baru"
                      : `${unseen.length} Berita Baru`}
                  </p>
                  <p className="text-xs text-slate-400 leading-tight">
                    Sejak kunjungan terakhir Anda
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  aria-label="Tutup notifikasi"
                  className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Article list */}
              <ul className="divide-y divide-slate-800/60">
                {unseen.map((article, i) => (
                  <motion.li
                    key={article.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i }}
                  >
                    <button
                      onClick={() => handleArticleClick(article)}
                      className="w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-800">
                        {article.image ? (
                          <img
                            src={article.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Newspaper className="h-5 w-5 text-slate-600" />
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-[10px] font-semibold tracking-wider text-amber-400 uppercase mb-0.5">
                          {article.category}
                        </span>
                        <p className="text-xs font-medium text-slate-200 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                          {article.title}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{article.date}</p>
                      </div>

                      <ArrowRight className="flex-shrink-0 h-3.5 w-3.5 text-slate-600 group-hover:text-amber-400 transition-colors self-center" />
                    </button>
                  </motion.li>
                ))}
              </ul>

              {/* Footer */}
              <div className="px-4 py-3 bg-slate-800/40 flex items-center justify-between gap-2">
                <button
                  onClick={handleViewAll}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  Lihat semua berita
                  <ArrowRight className="h-3 w-3" />
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                >
                  Tandai sudah dibaca
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
