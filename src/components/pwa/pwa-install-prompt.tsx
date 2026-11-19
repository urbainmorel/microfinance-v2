"use client";

import { Download, MoreVertical, Plus, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";

const DISMISS_KEY = "azari_pwa_install_dismissed_until";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function isStandalone(): boolean {
  const nav = window.navigator as NavigatorWithStandalone;
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function getDeviceInfo(): { isMobile: boolean; isIos: boolean; isSafari: boolean } {
  const ua = window.navigator.userAgent;
  const isIpadOs = /macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1;
  const isIos = /iphone|ipad|ipod/i.test(ua) || isIpadOs;
  const isSafari = /safari/i.test(ua) && !/crios|fxios|chrome|android|edgios/i.test(ua);

  return {
    isMobile: /android|iphone|ipad|ipod/i.test(ua) || isIpadOs,
    isIos,
    isSafari,
  };
}

function isDismissed(): boolean {
  try {
    return Number(window.localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function IosInstructions({ isSafari }: { isSafari: boolean }) {
  return (
    <div className="flex flex-col gap-4 text-sm text-foreground">
      {!isSafari ? (
        <p className="rounded-xl bg-muted p-3 text-muted-foreground">
          Ouvrez d&apos;abord cette page dans Safari pour pouvoir l&apos;ajouter à l&apos;écran
          d&apos;accueil.
        </p>
      ) : null}
      <ol className="flex flex-col gap-3">
        <li className="flex items-start gap-3">
          <Share className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            Touchez le bouton <strong>Partager</strong> dans la barre du navigateur.
          </span>
        </li>
        <li className="flex items-start gap-3">
          <Plus className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>, puis confirmez avec{" "}
            <strong>Ajouter</strong>.
          </span>
        </li>
      </ol>
    </div>
  );
}

function AndroidInstructions() {
  return (
    <div className="flex flex-col gap-4 text-sm text-foreground">
      <p>Ouvrez le menu de votre navigateur, puis choisissez :</p>
      <div className="flex items-start gap-3">
        <MoreVertical className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <p>
          <strong>Installer l&apos;application</strong> ou{" "}
          <strong>Ajouter à l&apos;écran d&apos;accueil</strong>.
        </p>
      </div>
    </div>
  );
}

function InstallPill({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-20 left-4 z-40 sm:bottom-6 sm:left-6 print:hidden">
      <div className="flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-border bg-card p-1 shadow-lift">
        <button
          type="button"
          onClick={onInstall}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          <Download className="size-4 shrink-0 text-accent" aria-hidden />
          <span>Installer l&apos;application</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer l'invite d'installation"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function InstallInstructionsModal({
  open,
  onOpenChange,
  isIos,
  isSafari,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isIos: boolean;
  isSafari: boolean;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Installer l'application"
      description="Ajoutez Azari à votre écran d'accueil pour y accéder comme une application."
    >
      {isIos ? <IosInstructions isSafari={isSafari} /> : <AndroidInstructions />}
    </Modal>
  );
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [device, setDevice] = useState({ isIos: false, isSafari: true });

  useEffect(() => {
    if (isAdmin || isStandalone() || isDismissed()) return;

    const info = getDeviceInfo();
    if (!info.isMobile) return;

    const showTimer = window.setTimeout(() => {
      setDevice({ isIos: info.isIos, isSafari: info.isSafari });
      setVisible(true);
    }, 0);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      try {
        window.localStorage.removeItem(DISMISS_KEY);
      } catch {
        // Ignore un stockage indisponible.
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [isAdmin]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch {
      // Ignore un stockage indisponible.
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) {
      setInstructionsOpen(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
    } catch {
      setInstructionsOpen(true);
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (!visible || isAdmin) return null;

  return (
    <>
      <InstallPill onInstall={() => void install()} onDismiss={dismiss} />
      <InstallInstructionsModal
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        isIos={device.isIos}
        isSafari={device.isSafari}
      />
    </>
  );
}
