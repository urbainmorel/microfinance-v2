"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";

import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import { PinBlockingCard } from "@/components/operations/guarantee-pin-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { invokeClientCommand } from "@/lib/client-command";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanAmount?: number;
  guaranteeRequired: number;
  guaranteeBlocked: number;
  remainingGuarantee: number;
  freeSavings: number;
  requestId?: string;
  onProceedToDeposit: () => void;
};

function GuaranteeNotice({
  loanAmount,
  guaranteeRequired,
  guaranteeBlocked,
  remainingGuarantee,
}: Pick<Props, "loanAmount" | "guaranteeRequired" | "guaranteeBlocked" | "remainingGuarantee">) {
  return (
    <>
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-xs leading-5 text-foreground">
        <div className="flex items-center gap-2 font-bold text-warning">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Retrait du prêt temporairement bloqué
        </div>
        <p className="mt-1.5 text-muted-foreground">
          {loanAmount
            ? `Votre prêt de ${formatFcfa(loanAmount)} est bien crédité sur votre compte.`
            : "Vos fonds de prêt sont bien crédités sur votre compte."}{" "}
          Conformément aux conditions de votre contrat, vous devez verser le dépôt de garantie avant
          de pouvoir effectuer un retrait.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5">
          <span className="text-[11px] font-semibold text-muted-foreground">Garantie requise</span>
          <p className="mt-1 font-display text-base font-bold [font-variant-numeric:tabular-nums]">
            {formatFcfa(guaranteeRequired)}
          </p>
        </div>
        <div className="rounded-xl border border-accent/30 bg-finance-soft/40 p-3.5">
          <span className="text-[11px] font-semibold text-accent">Reste à déposer</span>
          <p className="mt-1 font-display text-base font-bold text-accent [font-variant-numeric:tabular-nums]">
            {formatFcfa(remainingGuarantee)}
          </p>
        </div>
      </div>

      {guaranteeBlocked > 0 ? (
        <p className="text-xs text-muted-foreground">
          Montant déjà constitué en garantie :{" "}
          <span className="font-semibold text-foreground">{formatFcfa(guaranteeBlocked)}</span>
        </p>
      ) : null}

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs leading-5 text-foreground">
        <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          100% remboursée à la fin de votre prêt
        </div>
        <p className="mt-1 text-muted-foreground">
          Cette somme n’est pas un frais : elle vous est intégralement reversée dès le remboursement
          complet de votre prêt.
        </p>
      </div>
    </>
  );
}

function ModalActionButtons({
  remainingGuarantee,
  canBlockFromSavings,
  freeSavings,
  hasRequest,
  onDeposit,
  onStartPin,
  onClose,
}: {
  remainingGuarantee: number;
  canBlockFromSavings: boolean;
  freeSavings: number;
  hasRequest: boolean;
  onDeposit: () => void;
  onStartPin: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 pt-2">
      <Button type="button" variant="accent" onClick={onDeposit} className="w-full gap-2">
        <Smartphone className="size-4" aria-hidden />
        Déposer {formatFcfa(remainingGuarantee)} par Mobile Money
      </Button>

      {canBlockFromSavings && hasRequest ? (
        <Button type="button" variant="outline" onClick={onStartPin} className="w-full gap-2">
          <Lock className="size-4 text-accent" aria-hidden />
          Bloquer depuis mon solde d’épargne ({formatFcfa(freeSavings)} dispo)
        </Button>
      ) : null}

      <Button type="button" variant="ghost" onClick={onClose} className="w-full">
        Compris, je ferai le dépôt plus tard
      </Button>
    </div>
  );
}

function useSavingsBlocker(requestId?: string, onOpenChange?: (open: boolean) => void) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const runIdempotent = useIdempotentCommand();

  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);

  async function handleBlockFromSavings() {
    if (!requestId || !/^\d{4,6}$/.test(pin)) {
      return setPinError("Saisissez votre code PIN à 4 ou 6 chiffres.");
    }
    setBlocking(true);
    setPinError(null);
    try {
      await runIdempotent(requestId, (key) =>
        invokeClientCommand(supabase, {
          action: "guarantee.block",
          pin,
          idempotencyKey: key,
          payload: { requestId },
        }),
      );
      setPin("");
      setPinMode(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["active-loan-status"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      ]);
      onOpenChange?.(false);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Impossible de bloquer la garantie.");
    } finally {
      setBlocking(false);
    }
  }

  function handlePinChange(value: string) {
    setPin(value);
    if (pinError) setPinError(null);
  }

  function reset() {
    setPinMode(false);
    setPin("");
    setPinError(null);
  }

  return {
    pinMode,
    setPinMode,
    pin,
    handlePinChange,
    pinError,
    blocking,
    handleBlockFromSavings,
    reset,
  };
}

export function GuaranteeWithdrawalReminderModal({
  open,
  onOpenChange,
  loanAmount,
  guaranteeRequired,
  guaranteeBlocked,
  remainingGuarantee,
  freeSavings,
  requestId,
  onProceedToDeposit,
}: Props) {
  const blocker = useSavingsBlocker(requestId, onOpenChange);
  const canBlockFromSavings = freeSavings >= remainingGuarantee && remainingGuarantee > 0;

  function handleOpenChange(next: boolean) {
    if (blocker.blocking) return;
    blocker.reset();
    onOpenChange(next);
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Dépôt de garantie obligatoire"
      description="Pour débloquer vos retraits, vous devez constituer votre garantie de prêt."
      className="max-w-lg"
    >
      <div className="flex flex-col gap-5">
        <GuaranteeNotice
          loanAmount={loanAmount}
          guaranteeRequired={guaranteeRequired}
          guaranteeBlocked={guaranteeBlocked}
          remainingGuarantee={remainingGuarantee}
        />

        {blocker.pinMode ? (
          <PinBlockingCard
            pin={blocker.pin}
            pinError={blocker.pinError}
            blocking={blocker.blocking}
            remainingGuarantee={remainingGuarantee}
            onPinChange={blocker.handlePinChange}
            onCancel={() => blocker.setPinMode(false)}
            onConfirm={blocker.handleBlockFromSavings}
          />
        ) : (
          <ModalActionButtons
            remainingGuarantee={remainingGuarantee}
            canBlockFromSavings={canBlockFromSavings}
            freeSavings={freeSavings}
            hasRequest={Boolean(requestId)}
            onDeposit={() => {
              onOpenChange(false);
              onProceedToDeposit();
            }}
            onStartPin={() => blocker.setPinMode(true)}
            onClose={() => onOpenChange(false)}
          />
        )}
      </div>
    </Modal>
  );
}
