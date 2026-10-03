"use client";

import { useEffect, useRef, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallApp() {
  const pendingPrompt = useRef<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const syncDisplayMode = () => setInstalled(standalone.matches || navigatorWithStandalone.standalone === true);
    syncDisplayMode();
    const ua = navigator.userAgent;
    setPlatform(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      ? "ios" : /Android/.test(ua) ? "android" : "other");
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      pendingPrompt.current = event as InstallPrompt;
    };
    const onInstalled = () => {
      pendingPrompt.current = null;
      setInstalled(true);
      setHelpOpen(false);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", onInstalled);
    standalone.addEventListener("change", syncDisplayMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standalone.removeEventListener("change", syncDisplayMode);
    };
  }, []);

  async function install() {
    if (busy) return;
    const prompt = pendingPrompt.current;
    if (!prompt) {
      setHelpOpen((open) => !open);
      return;
    }
    pendingPrompt.current = null;
    setBusy(true);
    setHelpOpen(false);
    try {
      const result = await prompt.prompt();
      if (result.outcome === "accepted") setInstalled(true);
    } catch {
      setHelpOpen(true);
    } finally {
      setBusy(false);
    }
  }

  if (installed) return null;

  return (
    <div className="install-app">
      <button type="button" className="install-button" onClick={install} disabled={busy} aria-expanded={helpOpen} aria-controls="install-instructions">
        {busy ? "Membuka instalasi…" : "Instal Kiblat"}
      </button>
      <div id="install-instructions" className="install-instructions" hidden={!helpOpen}>
        <p>{platform === "ios"
          ? "Buka di Safari → Bagikan → Tambahkan ke Layar Utama."
          : platform === "android"
            ? "Buka di Chrome → menu ⋮ → Instal aplikasi atau Tambahkan ke layar utama."
            : "Buka menu browser → Instal Kiblat atau Instal halaman ini sebagai aplikasi, jika tersedia."}</p>
        <p>Tetap bisa dipakai tanpa instalasi. Koneksi internet diperlukan.</p>
      </div>
    </div>
  );
}
