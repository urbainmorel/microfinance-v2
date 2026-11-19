"use client";

import { Check, Download, Ellipsis, MoreVertical, Share, SquarePlus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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

function getDeviceInfo(): { isMobile: boolean; isIos: boolean } {
  const ua = window.navigator.userAgent;
  const isIpadOs = /macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1;

  return {
    isMobile: /android|iphone|ipad|ipod/i.test(ua) || isIpadOs,
    isIos: /iphone|ipad|ipod/i.test(ua) || isIpadOs,
  };
}

function isDismissed(): boolean {
  try {
    return Number(window.localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function InstructionStep({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 rounded-2xl border border-border bg-muted/40 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold text-foreground">{title}</p>
        <p className="mt-1 text-base leading-6 text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function IosInstructions() {
  return (
    <div className="flex flex-col gap-4 text-foreground">
      <p className="text-base leading-6 text-muted-foreground">
        L&apos;installation fonctionne sur iPhone dans <strong>Safari</strong> comme dans{" "}
        <strong>Chrome</strong>.
      </p>
      <ol className="flex flex-col gap-3">
        <InstructionStep icon={Share} title="1. Touchez Partager">
          Touchez l&apos;icône <strong>Partager</strong> de votre navigateur.
        </InstructionStep>
        <InstructionStep icon={Ellipsis} title="2. Touchez « En voir plus »">
          Faites défiler le menu et touchez <strong>En voir plus</strong>.
        </InstructionStep>
        <InstructionStep icon={SquarePlus} title="3. Ajoutez à l'écran d'accueil">
          Touchez <strong>Sur l&apos;écran d&apos;accueil</strong>, puis confirmez avec{" "}
          <strong>Ajouter</strong>.
        </InstructionStep>
      </ol>
      <p className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-3 text-base font-semibold text-accent">
        <Check className="size-5 shrink-0" aria-hidden />
        Azari apparaîtra comme une application sur votre téléphone.
      </p>
    </div>
  );
}

function AndroidInstructions() {
  return (
    <div className="flex flex-col gap-4 text-foreground">
      <p className="text-base leading-6 text-muted-foreground">
        Ouvrez le menu de votre navigateur, puis choisissez :
      </p>
      <ul className="flex flex-col gap-3">
        <InstructionStep icon={MoreVertical} title="Menu du navigateur">
          Touchez <strong>Installer l&apos;application</strong> ou{" "}
          <strong>Ajouter à l&apos;écran d&apos;accueil</strong>.
        </InstructionStep>
      </ul>
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
          className="inline-flex min-h-11 items-center gap-2.5 rounded-full px-4 text-base font-bold text-foreground transition hover:bg-muted"
        >
          <Download className="size-5 shrink-0 text-accent" aria-hidden />
          <span>Installer l&apos;application</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Masquer l'invite d'installation"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function InstallInstructionsModal({
  open,
  onOpenChange,
  isIos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isIos: boolean;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Installer l'application"
      description="Ajoutez Azari à votre écran d'accueil pour y accéder comme une application."
    >
      {isIos ? <IosInstructions /> : <AndroidInstructions />}
    </Modal>
  );
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [device, setDevice] = useState({ isIos: false });

  useEffect(() => {
    if (isAdmin || isStandalone() || isDismissed()) return;

    const info = getDeviceInfo();
    if (!info.isMobile) return;

    const showTimer = window.setTimeout(() => {
      setDevice({ isIos: info.isIos });
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
      />
    </>
  );
}
