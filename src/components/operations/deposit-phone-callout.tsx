"use client";

import { Check, Copy, Phone } from "lucide-react";
import { useState } from "react";

import { getOperatorInfo, OperatorLogo } from "@/components/ui/operator-logo";
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
 * Bandeau informatif affichant le logo de l'opérateur au ratio 1:1 au-dessus du
 * numéro Mobile Money de transfert, avec bouton "Copier".
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
  const opInfo = getOperatorInfo(operator);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/25 bg-finance-soft/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-accent">
        <Phone className="size-4 shrink-0" aria-hidden />
        <span>Numéro Mobile Money pour votre transfert</span>
      </div>

      {opInfo ? (
        <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
          <div className="size-16 overflow-hidden rounded-2xl border border-border/60 shadow-md sm:size-20">
            <OperatorLogo
              operator={opInfo.id}
              size={80}
              priority
              className="size-full object-cover"
            />
          </div>
          <span className="text-xs font-bold text-foreground">{opInfo.name}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-3.5 py-2.5">
        <span className="font-mono text-base font-extrabold tracking-wider text-foreground sm:text-xl">
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
