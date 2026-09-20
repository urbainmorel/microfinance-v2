"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { invokeClientCommand } from "@/lib/client-command";
import { formatFcfa } from "@/lib/format";
import { type ActiveLoanState } from "@/lib/hooks/use-active-loan";
import { useSupabase } from "@/lib/hooks/use-supabase";

function GuaranteeModalContent({
  state,
  remaining,
  pin,
  error,
  busy,
  setPin,
  cancel,
  confirm,
}: {
  state: ActiveLoanState;
  remaining: number;
  pin: string;
  error: string | null;
  busy: boolean;
  setPin: (value: string) => void;
  cancel: () => void;
  confirm: () => void;
}) {
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <dt className="text-xs font-semibold text-muted-foreground">Garantie requise</dt>
          <dd className="mt-1 font-display text-lg font-bold [font-variant-numeric:tabular-nums]">
            {formatFcfa(state.guaranteeRequired ?? 0)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <dt className="text-xs font-semibold text-muted-foreground">Montant à bloquer</dt>
          <dd className="mt-1 font-display text-lg font-bold text-accent [font-variant-numeric:tabular-nums]">
            {formatFcfa(remaining)}
          </dd>
        </div>
      </dl>
      <div>
        <label htmlFor="guarantee-pin" className="text-[13px] font-semibold text-foreground">
          Code PIN de confirmation
        </label>
        <div className="mt-2">
          <Input
            id="guarantee-pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            value={pin}
            aria-invalid={Boolean(error)}
            onChange={(event) => setPin(event.target.value)}
          />
        </div>
        {error ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warning">
            <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
            {error}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-separator pt-5">
        <Button variant="outline" onClick={cancel} disabled={busy}>
          Annuler
        </Button>
        <Button variant="accent" onClick={confirm} disabled={busy}>
          {busy ? "Blocage…" : "Confirmer"}
        </Button>
      </div>
    </div>
  );
}

export function GuaranteeActions({ state }: { state: ActiveLoanState }) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const runIdempotent = useIdempotentCommand();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const remaining = Math.max((state.guaranteeRequired ?? 0) - (state.guaranteeBlocked ?? 0), 0);

  function handlePinChange(value: string) {
    setPin(value);
    if (error) setError(null);
  }

  function closeModal() {
    setOpen(false);
    setPin("");
    setError(null);
  }

  async function blockGuarantee() {
    if (!state.requestId || !/^\d{4,6}$/.test(pin))
      return setError("Saisissez votre PIN de 4 à 6 chiffres.");
    setBusy(true);
    setError(null);
    try {
      await runIdempotent(state.requestId, (key) =>
        invokeClientCommand(supabase, {
          action: "guarantee.block",
          pin,
          idempotencyKey: key,
          payload: { requestId: state.requestId },
        }),
      );
      setPin("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["active-loan-status"] }),
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      ]);
      setOpen(false);
    } catch (commandError) {
      setError(commandError instanceof Error ? commandError.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Button size="sm" variant="accent" onClick={() => setOpen(true)}>
        Bloquer depuis mon épargne
      </Button>
      <Link
        href={`/client/deposit/request?motif=GUARANTEE&amount=${remaining}`}
        className="text-center text-sm font-semibold text-accent hover:underline"
      >
        Déposer ma garantie par Mobile Money ({formatFcfa(remaining)})
      </Link>

      <Modal
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          if (next) setOpen(true);
          else closeModal();
        }}
        title="Constituer la garantie"
        description="Vérifiez le montant qui sera bloqué sur votre épargne avant de confirmer."
        className="max-w-lg"
      >
        <GuaranteeModalContent
          state={state}
          remaining={remaining}
          pin={pin}
          error={error}
          busy={busy}
          setPin={handlePinChange}
          cancel={closeModal}
          confirm={() => void blockGuarantee()}
        />
      </Modal>
    </div>
  );
}
