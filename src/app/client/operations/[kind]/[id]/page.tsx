"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { invokeClientCommand } from "@/lib/client-command";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";
import { cn } from "@/lib/utils";

type OperationDetail = {
  amount: number;
  completedAt?: string | null;
  correlationId?: string | null;
  createdAt: string;
  id: string;
  kind: "deposit" | "withdrawal" | "repayment";
  label: string;
  paymentMethod?: string | null;
  reason?: string | null;
  recipient?: Record<string, string> | null;
  reference?: string | null;
  status: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PROCESSING: "En traitement",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  REJECTED: "Rejetée",
  CANCELLED: "Annulée",
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] break-words text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}

function OperationReceipt({ operation }: { operation: OperationDetail }) {
  const createdAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(operation.createdAt));
  return (
    <Card>
      <p className="text-sm font-semibold text-accent">Reçu d’opération</p>
      <h1 className="mt-1 font-display text-2xl font-bold">{operation.label}</h1>
      <p className="mt-3 font-display text-3xl font-extrabold">{formatFcfa(operation.amount)}</p>
      <dl className="mt-5">
        <DetailRow label="Statut" value={STATUS_LABELS[operation.status] ?? operation.status} />
        <DetailRow label="Créée le" value={createdAt} />
        <DetailRow label="Moyen" value={operation.paymentMethod} />
        <DetailRow label="Référence" value={operation.reference} />
        <DetailRow label="Motif du rejet" value={operation.reason} />
        <DetailRow label="Corrélation" value={operation.correlationId} />
      </dl>
    </Card>
  );
}

function CancellationCard({
  error,
  pending,
  pin,
  setPin,
  submit,
}: {
  error: string | null;
  pending: boolean;
  pin: string;
  setPin: (value: string) => void;
  submit: () => void;
}) {
  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-bold">Annuler cette demande</h2>
      <p className="text-sm text-muted-foreground">
        La demande sera annulée immédiatement. Toute somme réservée sera libérée.
      </p>
      <FormField
        id="cancel-pin"
        label="Code PIN"
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(event) => setPin(event.target.value)}
        error={error ?? undefined}
      />
      <Button variant="outline" className="w-full" disabled={pending} onClick={submit}>
        {pending ? "Annulation…" : "Confirmer l’annulation"}
      </Button>
    </Card>
  );
}

export default function OperationDetailPage() {
  const { id, kind } = useParams<{ id: string; kind: string }>();
  const supabase = useSupabase();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pin, setPin] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["client-operation", kind, id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_operation_detail", {
        p_kind: kind,
        p_operation: id,
      });
      if (error) throw error;
      return data as OperationDetail;
    },
  });
  const cancellation = useMutation({
    mutationFn: async () => {
      if (!/^\d{4,6}$/.test(pin)) throw new Error("Saisissez votre PIN de 4 à 6 chiffres.");
      return invokeClientCommand(supabase, {
        action: "request.cancel",
        pin,
        idempotencyKey: crypto.randomUUID(),
        payload: { requestId: id, requestType: kind },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-operations"] });
      router.replace("/client/operations");
    },
    onError: (error) =>
      setCancelError(error instanceof Error ? error.message : "Annulation impossible."),
  });

  if (query.isPending) return <p role="status">Chargement du reçu…</p>;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="Opération introuvable"
        hint="Ce reçu n’est pas disponible."
      />
    );
  }
  const operation = query.data;
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/client/operations"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start px-0")}
      >
        <ArrowLeft aria-hidden /> Mes opérations
      </Link>
      <OperationReceipt operation={operation} />
      {operation.status === "PENDING" ? (
        <CancellationCard
          error={cancelError}
          pending={cancellation.isPending}
          pin={pin}
          setPin={setPin}
          submit={() => {
            setCancelError(null);
            cancellation.mutate();
          }}
        />
      ) : null}
    </div>
  );
}
