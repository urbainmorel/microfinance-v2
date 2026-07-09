import { Clock, Lock } from "lucide-react";

import { formatFcfa } from "@/lib/format";
import { type WalletSubAccounts, type WalletSummary } from "@/lib/wallet";

type Props = { summary: WalletSummary; subAccounts: WalletSubAccounts };

/**
 * Carte héros portefeuille (DESIGN §11.1, PRD §7.2). Rend les formules UNIQUES calculées
 * en amont — aucune arithmétique locale. Doré = bloqué/réservé ; réservé retenu sur le
 * disponible, jamais recompté dans le patrimoine.
 */
export function WalletCard({ summary, subAccounts }: Props) {
  const stats = [
    { key: "blocked", Icon: Lock, label: "Montant bloqué", value: summary.blocked },
    { key: "reserved", Icon: Clock, label: "Montant réservé", value: summary.reserved },
  ] as const;

  return (
    <section className="rounded-2xl bg-hero-green p-6 text-white shadow-hero">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        Solde disponible
      </p>
      <p className="mt-1 font-display text-[40px] font-bold leading-none">
        {formatFcfa(summary.available)}
      </p>

      <div className="mt-3 flex flex-col gap-0.5 text-xs text-white/70">
        <span>Dont épargne libre · {formatFcfa(subAccounts.free_savings)}</span>
        <span>Dont prêt décaissé disponible · {formatFcfa(subAccounts.disbursed_loan)}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
        {stats.map(({ key, Icon, label, value }) => (
          <div key={key}>
            <div className="flex items-center gap-1.5 text-white/60">
              <Icon className="size-3.5 text-brand-gold-bright" strokeWidth={1.8} aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <p className="mt-1 font-display text-base font-bold text-brand-gold-bright">
              {formatFcfa(value)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-white/50">
        Le montant réservé est retenu sur le disponible, jamais compté deux fois.
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Solde total (patrimoine)
        </span>
        <span className="font-display text-lg font-bold">{formatFcfa(summary.netWorth)}</span>
      </div>
    </section>
  );
}
