"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LoanContractActions } from "@/components/loans/loan-contract-actions";
import { LoanContractDocument, type Contract } from "@/components/loans/loan-contract-document";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeClientCommand } from "@/lib/client-command";
import { usePlatformName } from "@/lib/hooks/use-platform-name";
import { useSupabase } from "@/lib/hooks/use-supabase";

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

function useContractSignature({
  requestId,
  accepted,
  pin,
}: {
  requestId: string;
  accepted: boolean;
  pin: string;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!accepted) throw new Error("Vous devez accepter les conditions du contrat.");
      if (!/^\d{4,6}$/.test(pin)) throw new Error("Saisissez votre code PIN de 4 à 6 chiffres.");
      return invokeClientCommand(supabase, {
        action: "loan.contract.sign",
        pin,
        idempotencyKey: crypto.randomUUID(),
        payload: { requestId },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["wallet"] }),
        cache.invalidateQueries({ queryKey: ["active-loan-status"] }),
        cache.invalidateQueries({ queryKey: ["loan-contract", requestId] }),
        cache.invalidateQueries({ queryKey: ["active-loans-for-repayment"] }),
      ]);
      router.replace("/client/dashboard");
    },
  });
}

export function LoanContract({ requestId }: { requestId: string }) {
  const platformName = usePlatformName();
  const query = useContract(requestId);
  const [pin, setPin] = useState("");
  const [accepted, setAccepted] = useState(false);
  const signature = useContractSignature({ requestId, accepted, pin });

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-3xl py-4">
        <Skeleton className="h-[520px] w-full rounded-2xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-3xl py-4">
        <EmptyState
          icon={FileSignature}
          title="Contrat indisponible"
          hint="Le contrat sera généré après l’acceptation de votre demande."
        />
      </div>
    );
  }

  const contract = query.data;
  const isSigned = Boolean(contract.signed_at);
  const formattedSignedDate = contract.signed_at
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(
        new Date(contract.signed_at),
      )
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-2">
      <Card className="relative overflow-hidden border border-border bg-card p-6 shadow-md sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Conditions du contrat de prêt
            </h1>
            <p className="text-sm text-muted-foreground">
              Pour finaliser et débloquer votre financement, vous devez d’abord accepter les
              conditions contractuelles applicables à votre prêt.
            </p>
          </div>
          <Link
            href="/client/loans"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Fermer et retourner à la liste des prêts"
          >
            <X className="size-5" />
          </Link>
        </div>

        <LoanContractDocument contract={contract} platformName={platformName} />

        <LoanContractActions
          isSigned={isSigned}
          formattedSignedDate={formattedSignedDate}
          accepted={accepted}
          setAccepted={setAccepted}
          pin={pin}
          setPin={setPin}
          isPending={signature.isPending}
          error={signature.error}
          onClearError={() => signature.reset()}
          onSign={() => signature.mutate()}
        />
      </Card>
    </div>
  );
}
