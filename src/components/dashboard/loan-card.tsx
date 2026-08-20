"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { useIdempotentCommand } from "@/components/client/use-idempotent-command";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeClientCommand } from "@/lib/client-command";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { cn } from "@/lib/utils";

type LoanState = {
  displayState: number;
  loanId?: string;
  requestId?: string;
  remainingPrincipal?: number;
  guaranteeRequired?: number;
  guaranteeBlocked?: number;
};

const DEFAULT_COPY = {
  title: "Aucun prêt en cours",
  body: "Simulez une offre et envoyez votre demande.",
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

function GuaranteeActions({ state }: { state: LoanState }) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const runIdempotent = useIdempotentCommand();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    } catch (commandError) {
      setError(commandError instanceof Error ? commandError.message : "Opération impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <label htmlFor="guarantee-pin" className="text-xs font-semibold text-muted-foreground">
        PIN pour bloquer mon épargne disponible
      </label>
      <input
        id="guarantee-pin"
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(event) => setPin(event.target.value)}
        className="h-11 rounded-[14px] border border-border bg-card px-4"
      />
      {error ? <p className="text-xs font-medium text-warning">{error}</p> : null}
      <Button size="sm" variant="accent" onClick={blockGuarantee} disabled={busy}>
        {busy ? "Blocage…" : "Constituer la garantie"}
      </Button>
      {state.displayState === 5 ? (
        <Link
          href="/client/deposit/request"
          className="text-center text-sm font-semibold text-accent"
        >
          Effectuer le dépôt complémentaire
        </Link>
      ) : null}
    </div>
  );
}

function LoanAction({ state }: { state: LoanState }) {
  if (state.displayState === 1 || state.displayState === 10)
    return (
      <Link
        href="/client/loans/request"
        className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-4 w-full")}
      >
        Simuler un prêt
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
    <Card>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Mon prêt
      </p>
      <p className="mt-2 font-display text-lg font-bold text-foreground">{copy.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
      {state.remainingPrincipal === undefined ? null : (
        <p className="mt-3 text-sm font-semibold text-foreground">
          Capital restant : {formatFcfa(state.remainingPrincipal)}
        </p>
      )}
      {remainingGuarantee > 0 ? (
        <p className="mt-3 text-sm font-semibold text-foreground">
          Garantie restante : {formatFcfa(remainingGuarantee)}
        </p>
      ) : null}
      <LoanAction state={state} />
    </Card>
  );
}
