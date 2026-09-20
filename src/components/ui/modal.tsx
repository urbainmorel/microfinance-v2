"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

import type { ReactNode, RefObject } from "react";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const subscribeToClient = () => () => undefined;

function trapTabKey(event: KeyboardEvent, panel: HTMLDivElement) {
  const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (!focusable.length) {
    event.preventDefault();
    panel.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function useModalInteractions(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  panelRef: RefObject<HTMLDivElement | null>,
  closeButtonRef: RefObject<HTMLButtonElement | null>,
) {
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!panelRef.current?.querySelector('[aria-busy="true"]')) onOpenChangeRef.current(false);
      } else if (event.key === "Tab" && panelRef.current) {
        trapTabKey(event, panelRef.current);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closeButtonRef, open, panelRef]);
}

function ModalHeader({
  title,
  description,
  titleId,
  descriptionId,
  closeButtonRef,
  close,
}: Pick<ModalProps, "title" | "description"> & {
  titleId: string;
  descriptionId: string;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  close: () => void;
}) {
  return (
    <header className="flex shrink-0 items-start justify-between gap-6 border-b border-border bg-card px-5 py-5 sm:px-7">
      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          Parcours sécurisé
        </p>
        <h2
          id={titleId}
          className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={close}
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted"
        aria-label="Fermer la fenêtre"
      >
        <X className="size-4" aria-hidden />
      </button>
    </header>
  );
}

export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useModalInteractions(open, onOpenChange, panelRef, closeButtonRef);

  if (!isClient || !open) return null;
  const close = () => {
    if (!panelRef.current?.querySelector('[aria-busy="true"]')) onOpenChange(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-foreground/55 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "flex h-dvh max-h-dvh w-full max-w-3xl flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[20px]",
          className,
        )}
      >
        <ModalHeader
          title={title}
          description={description}
          titleId={titleId}
          descriptionId={descriptionId}
          closeButtonRef={closeButtonRef}
          close={close}
        />
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto bg-background px-5 py-5 sm:px-7 sm:py-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
