"use client";

import { Check, Copy, Phone } from "lucide-react";
import { useState } from "react";

import { OperatorLogo } from "@/components/ui/operator-logo";
import { DEFAULT_DEPOSIT_INSTRUCTION } from "@/lib/hooks/use-deposit-phone";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 active:scale-95"
      aria-label="Copier le numéro Mobile Money"
    >
      {copied ? (
        <>
          <Check className="size-3.5" aria-hidden />
          Copié !
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden />
          Copier
        </>
      )}
    </button>
  );
}

/**
 * Bandeau informatif affichant le numéro Mobile Money de dépôt
 * configuré par l'administrateur, avec le logo de l'opérateur et le bouton "Copier".
 * Ne s'affiche que si le numéro est fourni.
 */
export function DepositPhoneCallout({
  phone,
  instruction,
  operator,
}: {
  phone: string;
  instruction?: string | null;
  operator?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-accent/25 bg-finance-soft/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-accent">
          <Phone className="size-4 shrink-0" aria-hidden />
          <span>Numéro Mobile Money de transfert</span>
        </div>
        {operator ? <OperatorLogo operator={operator} className="h-6 w-auto shrink-0" /> : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-base font-bold tracking-wider text-foreground sm:text-lg">
          {phone}
        </span>
        <CopyButton text={phone} />
      </div>
      <p className="whitespace-pre-line text-xs leading-5 text-muted-foreground">
        {instruction?.trim() || DEFAULT_DEPOSIT_INSTRUCTION}
      </p>
    </div>
  );
}
