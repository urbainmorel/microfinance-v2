import { Clock, Lock, WalletCards } from "lucide-react";

import { formatFcfa } from "@/lib/format";
import { useActiveLoan } from "@/lib/hooks/use-active-loan";
import { type WalletSubAccounts, type WalletSummary } from "@/lib/wallet";

type Props = { summary: WalletSummary; subAccounts: WalletSubAccounts };

export function WalletCard({ summary, subAccounts }: Props) {
  const { data: loan } = useActiveLoan();
  const isGuaranteePending =
    Boolean(loan?.guaranteeRequired) &&
    !loan?.guaranteeSatisfied &&
    (loan?.remainingGuarantee ?? 0) > 0;

  const stats = [
    { key: "blocked", Icon: Lock, label: "Montant bloqué", value: summary.blocked },
    { key: "reserved", Icon: Clock, label: "Retrait en attente", value: summary.reserved },
  ] as const;

  return (
    <section className="relative isolate overflow-hidden rounded-[24px] bg-balance-gradient p-6 text-white shadow-hero sm:p-8">
      <span
        className="pointer-events-none absolute -right-16 -top-20 -z-10 size-64 rounded-full border-[38px] border-white/[0.06]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-28 right-24 -z-10 size-56 rounded-full border-[28px] border-white/[0.045]"
        aria-hidden
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white/75">
          <WalletCards className="size-4" strokeWidth={1.8} aria-hidden />
          Solde disponible
        </div>
        <span className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
          Portefeuille
        </span>
      </div>

      <p className="mt-5 font-display text-[40px] font-bold leading-none tracking-[-0.045em] [font-variant-numeric:tabular-nums] sm:text-[48px]">
        {formatFcfa(summary.available)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium text-white/70">
        <span>Épargne libre · {formatFcfa(subAccounts.free_savings)}</span>
        {isGuaranteePending && subAccounts.disbursed_loan > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-amber-200">
            <Lock className="size-3" aria-hidden />
            Prêt crédité · Retrait verrouillé ({formatFcfa(subAccounts.disbursed_loan)})
          </span>
        ) : (
          <span>Prêt disponible · {formatFcfa(subAccounts.disbursed_loan)}</span>
        )}
      </div>

      <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-white/15 pt-5 sm:grid-cols-3">
        {stats.map(({ key, Icon, label, value }) => (
          <div key={key}>
            <div className="flex items-center gap-1.5 text-white/60">
              <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
              <span className="text-[11px] font-semibold">{label}</span>
            </div>
            <p className="mt-1.5 font-display text-base font-bold [font-variant-numeric:tabular-nums]">
              {formatFcfa(value)}
            </p>
          </div>
        ))}
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold text-white/60">Patrimoine total</p>
          <p className="mt-1.5 font-display text-base font-bold [font-variant-numeric:tabular-nums]">
            {formatFcfa(summary.netWorth)}
          </p>
        </div>
      </div>
    </section>
  );
}
