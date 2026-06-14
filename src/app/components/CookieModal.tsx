"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GA_MEASUREMENT_ID = "G-27CFRN327T";

export default function CookieModal() {
  const [showModal, setShowModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("novidia_cookie_consent");
    if (!consent) {
      setShowModal(true);
    } else {
      try {
        const parsed = JSON.parse(consent);
        if (parsed.analytics) {
          loadGA();
        } else {
          disableGA();
        }
      } catch (e) {
        setShowModal(true);
      }
    }
  }, []);

  const loadGA = () => {
    if (typeof window === "undefined") return;
    delete (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`];

    if (!document.getElementById("google-analytics-script")) {
      const script1 = document.createElement("script");
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script1.id = "google-analytics-script";
      document.head.appendChild(script1);

      const script2 = document.createElement("script");
      script2.id = "google-analytics-init";
      script2.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}');
      `;
      document.head.appendChild(script2);
    }
  };

  const disableGA = () => {
    if (typeof window === "undefined") return;
    (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  };

  const handleAcceptAll = () => {
    localStorage.setItem(
      "novidia_cookie_consent",
      JSON.stringify({ essentials: true, analytics: true })
    );
    loadGA();
    setShowModal(false);
  };

  const handleDenyAll = () => {
    localStorage.setItem(
      "novidia_cookie_consent",
      JSON.stringify({ essentials: true, analytics: false })
    );
    disableGA();
    setShowModal(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(
      "novidia_cookie_consent",
      JSON.stringify({ essentials: true, analytics: analyticsEnabled })
    );
    if (analyticsEnabled) {
      loadGA();
    } else {
      disableGA();
    }
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-110 bg-zinc-950/60 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto font-montserrat">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6 md:p-8 max-w-md w-full flex flex-col gap-5 relative select-none"
        >
          {/* Header - Centered & Brand Blue Montserrat */}
          <div className="w-full text-center">
            <h3 className="font-extrabold text-xl text-main font-montserrat tracking-tight">
              Ciasteczka? Gdzie?!
            </h3>
          </div>

          {/* Short Text */}
          <p className="text-sm text-zinc-500 font-medium leading-relaxed text-center">
            Ta strona używa niezbędnych plików cookies do uwierzytelniania i zapisywania motywu. Korzystamy również z opcjonalnych plików cookies Google Analytics, aby ulepszać naszą witrynę.
          </p>

          {/* Expanded preferences panel */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-y-auto max-h-60 pr-1 flex flex-col gap-3.5 border-t border-zinc-100 pt-4"
              >
                {/* Essential Cookies */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700">Niezbędne pliki (Essential)</span>
                    <div className="w-8 h-4 rounded-full bg-main/30 flex items-center p-0.5 opacity-60 cursor-not-allowed">
                      <div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5 shadow-sm" />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                    Umożliwiają poprawne działanie podstawowych funkcji witryny, takich jak motyw graficzny (theme), uwierzytelnianie użytkownika czy zapamiętywanie preferencji sesji. Nie można ich wyłączyć.
                  </p>
                </div>

                {/* Analytical Cookies (Google Analytics) */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700">Analityczne (Google Analytics)</span>
                    <button
                      type="button"
                      onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                      className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
                        analyticsEnabled ? "bg-main" : "bg-zinc-200"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                          analyticsEnabled ? "translate-x-3.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                    Pomagają nam zbierać anonimowe statystyki o ruchu na stronie w celu ulepszania naszych usług za pomocą narzędzia Google Analytics.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand toggle (above buttons) */}
          <div className="w-full flex justify-center mt-1">
            {!isExpanded ? (
              <button
                onClick={() => setIsExpanded(true)}
                className="py-1 text-xs font-bold text-main hover:underline cursor-pointer text-center w-full"
              >
                Dostosuj preferencje plików cookies
              </button>
            ) : (
              <button
                onClick={() => setIsExpanded(false)}
                className="py-1 text-xs font-bold text-zinc-400 hover:text-zinc-600 cursor-pointer text-center w-full"
              >
                Zwiń opcje szczegółowe
              </button>
            )}
          </div>

          {/* Buttons layout (below expand toggle) */}
          <div className="flex flex-col gap-3">
            {!isExpanded ? (
              <div className="flex gap-3">
                <button
                  onClick={handleDenyAll}
                  className="w-1/2 py-3 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-bold text-sm transition-colors cursor-pointer"
                >
                  Odrzuć opcjonalne
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="w-1/2 py-3 rounded-xl bg-main hover:brightness-110 text-white font-bold text-sm transition-all cursor-pointer shadow-md shadow-main/10"
                >
                  Akceptuj wszystkie
                </button>
              </div>
            ) : (
              <button
                onClick={handleSavePreferences}
                className="py-3 rounded-xl bg-main hover:brightness-110 text-white font-bold text-sm transition-all cursor-pointer shadow-md shadow-main/10 w-full"
              >
                Zatwierdź wybrane
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
