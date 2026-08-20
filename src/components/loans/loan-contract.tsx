"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeClientCommand } from "@/lib/client-command";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { cn } from "@/lib/utils";

type ContractContent = {
  borrower: { firstname: string; lastname: string; country: string };
  clauses: Record<string, boolean | number | string>;
  loan: { principal: number; currency: string; durationMonths: number; purpose: string };
  terms: Record<string, string | number | null>;
};
type Contract = {
  content: ContractContent;
  content_hash: string;
  contract_number: string;
  generated_at: string;
  id: string;
  signed_at: string | null;
};

function useContract(requestId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["loan-contract", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_contracts")
        .select("id,contract_number,content,content_hash,generated_at,signed_at")
        .eq("request_id", requestId)
        .single();
      if (error) throw error;
      return data as unknown as Contract;
    },
  });
}

function ContractTerms({ contract }: { contract: Contract }) {
  const { loan, terms } = contract.content;
  const fees = Number(terms.processingFeeFlat ?? 0) + Number(terms.managementFeeFlat ?? 0);
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase text-accent">
          Contrat {contract.contract_number}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">Contrat de prêt individuel</h1>
      </div>
      <p className="text-sm leading-6">
        Entre l’entité prêteuse opérant dans le pays du client et{" "}
        <strong>
          {contract.content.borrower.firstname} {contract.content.borrower.lastname}
        </strong>
        , il est convenu ce qui suit.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Term label="Capital" value={formatFcfa(loan.principal)} />
        <Term label="Durée" value={`${loan.durationMonths} mois`} />
        <Term label="Taux mensuel" value={`${terms.interestRate} %`} />
        <Term label="Frais fixes" value={formatFcfa(fees)} />
        <Term label="Garantie" value={`${terms.guaranteeRate ?? 0} %`} />
        <Term label="Pénalité journalière" value={`${terms.latePenaltyRate ?? 0} %`} />
      </dl>
      <div className="space-y-2 text-sm leading-6">
        <p>Les mensualités sont constantes et calculées sur le capital restant dû.</p>
        <p>
          Le coût effectif annuel est plafonné à 20 %. Tout remboursement anticipé est sans frais.
        </p>
        <p>
          En cas d’impayé, la garantie peut être mobilisée selon les conditions du dossier. Les
          instances juridiques compétentes sont celles du pays du client.
        </p>
      </div>
      <p className="break-all text-xs text-muted-foreground">
        Empreinte SHA-256 : {contract.content_hash}
      </p>
    </Card>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function SignedNotice({ signedAt }: { signedAt: string }) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(signedAt));
  return (
    <Card>
      <p className="font-semibold text-accent">Contrat signé le {date}</p>
    </Card>
  );
}

export function LoanContract({ requestId }: { requestId: string }) {
  const query = useContract(requestId);
  const supabase = useSupabase();
  const router = useRouter();
  const cache = useQueryClient();
  const [pin, setPin] = useState("");
  const [accepted, setAccepted] = useState(false);
  const signature = useMutation({
    mutationFn: async () => {
      if (!accepted) throw new Error("Vous devez accepter les conditions du contrat.");
      if (!/^\d{4,6}$/.test(pin)) throw new Error("Saisissez votre PIN de 4 à 6 chiffres.");
      return invokeClientCommand(supabase, {
        action: "loan.contract.sign",
        pin,
        idempotencyKey: crypto.randomUUID(),
        payload: { requestId },
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["active-loan-status"] });
      router.replace("/client/loans");
    },
  });
  if (query.isPending) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (query.isError || !query.data)
    return (
      <EmptyState
        icon={FileSignature}
        title="Contrat indisponible"
        hint="Le contrat sera généré après l’acceptation de votre demande."
      />
    );
  return (
    <div className="space-y-4">
      <Link href="/client/loans" className={cn(buttonVariants({ variant: "ghost" }), "px-0")}>
        ← Mes prêts
      </Link>
      <ContractTerms contract={query.data} />
      {query.data.signed_at ? (
        <SignedNotice signedAt={query.data.signed_at} />
      ) : (
        <Card className="space-y-3">
          <label className="flex gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>J’ai lu et j’accepte sans réserve les conditions contractuelles ci-dessus.</span>
          </label>
          <FormField
            id="contract-pin"
            label="Code PIN de signature"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            error={signature.error?.message}
          />
          <Button
            className="w-full"
            variant="accent"
            disabled={signature.isPending}
            onClick={() => signature.mutate()}
          >
            {signature.isPending ? "Signature…" : "Signer définitivement"}
          </Button>
        </Card>
      )}
    </div>
  );
}
