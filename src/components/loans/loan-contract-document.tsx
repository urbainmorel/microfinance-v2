import { Building2, Lock } from "lucide-react";

import { formatFcfa } from "@/lib/format";

export type ContractContent = {
  borrower: {
    clientId: string;
    firstname: string;
    lastname: string;
    country: string;
    idType?: string;
    idNumber?: string;
  };
  clauses: Record<string, boolean | number | string>;
  loan: {
    principal: number;
    currency: string;
    durationMonths: number;
    purpose: string;
  };
  terms: Record<string, string | number | null>;
};

export type Contract = {
  content: ContractContent;
  content_hash: string;
  contract_number: string;
  generated_at: string;
  id: string;
  signed_at: string | null;
};

function TermBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="shadow-xs rounded-lg border border-border/70 bg-card p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-foreground">{value}</dd>
    </div>
  );
}

function ContractTermsGrid({
  loan,
  terms,
}: {
  loan: ContractContent["loan"];
  terms: ContractContent["terms"];
}) {
  const fees = Number(terms.processingFeeFlat ?? 0) + Number(terms.managementFeeFlat ?? 0);
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Caractéristiques du financement
      </h3>
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <TermBox label="Capital emprunté" value={formatFcfa(loan.principal)} />
        <TermBox label="Durée de remboursement" value={`${loan.durationMonths} mois`} />
        <TermBox label="Taux d’intérêt annuel" value={`${terms.interestRate} %`} />
        <TermBox label="Frais fixes" value={formatFcfa(fees)} />
        <TermBox label="Garantie exigée" value={`${terms.guaranteeRate ?? 0} %`} />
        <TermBox label="Pénalité journalière" value={`${terms.latePenaltyRate ?? 0} %`} />
      </dl>
    </div>
  );
}

function ContractClausesAndSeal({ hash }: { hash: string }) {
  return (
    <>
      <div className="space-y-3 text-muted-foreground">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Clauses et engagements
        </h3>
        <p>
          <strong>Article 1 — Amortissement :</strong> Les mensualités sont constantes et calculées
          sur le capital restant dû.
        </p>
        <p>
          <strong>Article 2 — Remboursement anticipé :</strong> Tout remboursement anticipé est sans
          frais.
        </p>
        <p>
          <strong>Article 3 — Garantie & Défaillance :</strong> En cas d’impayé persistant, la
          garantie constituée peut être mobilisée selon les conditions réglementaires du dossier.
          Les instances juridiques compétentes sont celles du pays de résidence du client.
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Lock className="size-3.5 text-accent" />
          <span>Empreinte cryptographique de scellement (SHA-256)</span>
        </div>
        <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{hash}</p>
      </div>
    </>
  );
}

export function LoanContractDocument({
  contract,
  platformName,
}: {
  contract: Contract;
  platformName: string;
}) {
  const { loan, terms, borrower } = contract.content;
  const formattedGeneratedDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date(contract.generated_at));

  return (
    <div className="shadow-xs mt-5 overflow-hidden rounded-xl border border-border/90 bg-muted/20">
      <div className="flex items-center justify-between border-b border-border/70 bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Building2 className="size-4 text-accent" />
          <span>{platformName}</span>
        </div>
        <span className="font-mono text-[11px] font-medium text-accent">
          Réf: {contract.contract_number}
        </span>
      </div>

      <div className="max-h-[380px] overflow-y-auto bg-card p-5 text-sm leading-relaxed sm:p-6">
        <div className="space-y-6">
          <div className="border-b border-border/50 pb-4">
            <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
              Contrat de prêt individuel
            </h2>
            <p className="text-xs text-muted-foreground">
              Émis le {formattedGeneratedDate} · Réf. {contract.contract_number}
            </p>
          </div>

          <p className="text-foreground">
            Entre l’institution prêteuse <strong>{platformName}</strong> opérant dans le pays du
            client et{" "}
            <strong>
              {borrower.firstname} {borrower.lastname}
            </strong>
            {borrower.country ? ` (résidant en ${borrower.country})` : ""}, il est convenu ce qui
            suit :
          </p>

          <ContractTermsGrid loan={loan} terms={terms} />
          <ContractClausesAndSeal hash={contract.content_hash} />
        </div>
      </div>
    </div>
  );
}
