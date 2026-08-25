"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeClientCommand } from "@/lib/client-command";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { cn } from "@/lib/utils";

type LoanState = {
  displayState: number;
  contractSigned?: boolean;
  loanId?: string;
  requestId?: string;
  remainingPrincipal?: number;
  guaranteeRequired?: number;
  guaranteeBlocked?: number;
};

const DEFAULT_COPY = {
  title: "Aucun prêt en cours",
  body: "Choisissez une offre adaptée à votre projet et envoyez votre demande.",
};
const STATE_COPY: Record<number, { title: string; body: string }> = {
  1: DEFAULT_COPY,
  2: { title: "Demande en cours d’analyse", body: "Votre dossier est en cours d’étude." },
  3: {
    title: "Informations complémentaires",
    body: "Un agent attend des éléments supplémentaires.",
  },
  4: { title: "Prêt accepté", body: "Constituez la garantie pour poursuivre le décaissement." },
  5: { title: "Garantie incomplète", body: "Un dépôt de garantie complémentaire est nécessaire." },
  6: { title: "Garantie constituée", body: "Votre prêt est prêt pour le décaissement." },
  7: { title: "Prêt décaissé", body: "Les fonds sont disponibles selon le mode choisi." },
  8: { title: "Prêt en remboursement", body: "Consultez votre solde restant et vos échéances." },
  9: { title: "Prêt terminé", body: "Vos fonds bloqués ont été automatiquement libérés." },
  10: {
    title: "Demande rejetée",
    body: "Vous pouvez consulter le dossier puis déposer une nouvelle demande.",
  },
};

function useLoanStatus() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["active-loan-status"],
    queryFn: async (): Promise<LoanState> => {
      const { data, error } = await supabase.rpc("get_active_loan_status");
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as LoanState;
    },
  });
}

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
  state: LoanState;
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
        <input
          id="guarantee-pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={6}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-input bg-card px-4 text-base outline-none focus:border-ring focus:ring-4 focus:ring-ring/10"
        />
        {error ? <p className="mt-2 text-xs font-semibold text-warning">{error}</p> : null}
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

function GuaranteeActions({ state }: { state: LoanState }) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const runIdempotent = useIdempotentCommand();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const remaining = Math.max((state.guaranteeRequired ?? 0) - (state.guaranteeBlocked ?? 0), 0);

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
        Constituer la garantie
      </Button>
      {state.displayState === 5 ? (
        <Link
          href="/client/deposit/request"
          className="text-center text-sm font-semibold text-accent"
        >
          Effectuer le dépôt complémentaire
        </Link>
      ) : null}

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
          setPin={setPin}
          cancel={closeModal}
          confirm={() => void blockGuarantee()}
        />
      </Modal>
    </div>
  );
}

function LoanAction({ state }: { state: LoanState }) {
  if ([4, 5, 6].includes(state.displayState) && !state.contractSigned && state.requestId)
    return (
      <Link
        href={`/client/loans/contracts/${state.requestId}`}
        className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-4 w-full")}
      >
        Lire et signer mon contrat
      </Link>
    );
  if (state.displayState === 4 || state.displayState === 5)
    return <GuaranteeActions state={state} />;
  if (state.displayState === 7 || state.displayState === 8)
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {state.loanId ? (
          <Link
            href={`/client/loans/${state.loanId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Voir l’échéancier
          </Link>
        ) : null}
        <Link
          href="/client/repay/request"
          className={buttonVariants({ variant: "accent", size: "sm" })}
        >
          Rembourser mon prêt
        </Link>
      </div>
    );
  return null;
}

export function LoanCard() {
  const query = useLoanStatus();
  if (query.isPending) return <Skeleton className="h-[170px] w-full rounded-2xl" />;
  const state = query.data ?? { displayState: 1 };
  const copy = STATE_COPY[state.displayState] ?? DEFAULT_COPY;
  const remainingGuarantee = Math.max(
    (state.guaranteeRequired ?? 0) - (state.guaranteeBlocked ?? 0),
    0,
  );
  return (
    <Card className="flex h-full min-h-[280px] flex-col p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-finance-soft text-accent">
          <HandCoins className="size-[18px]" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Mon prêt
        </span>
      </div>

      <p className="mt-5 font-display text-xl font-bold tracking-[-0.025em] text-foreground">
        {copy.title}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.body}</p>

      {state.remainingPrincipal === undefined && remainingGuarantee <= 0 ? null : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {state.remainingPrincipal === undefined ? null : (
            <div className="rounded-xl bg-muted/75 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Capital restant</p>
              <p className="mt-1 font-display text-sm font-bold [font-variant-numeric:tabular-nums]">
                {formatFcfa(state.remainingPrincipal)}
              </p>
            </div>
          )}
          {remainingGuarantee > 0 ? (
            <div className="rounded-xl bg-muted/75 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Garantie restante</p>
              <p className="mt-1 font-display text-sm font-bold [font-variant-numeric:tabular-nums]">
                {formatFcfa(remainingGuarantee)}
              </p>
            </div>
          ) : null}
        </div>
      )}
      <div className="mt-auto pt-1">
        <LoanAction state={state} />
      </div>
    </Card>
  );
}
