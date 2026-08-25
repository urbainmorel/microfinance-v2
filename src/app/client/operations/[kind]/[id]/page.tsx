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
import { Modal } from "@/components/ui/modal";
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
  const recipient = operation.recipient
    ? Object.values(operation.recipient).filter(Boolean).join(" · ")
    : null;
  return (
    <Card className="p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Reçu d’opération</p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-[-0.025em]">
        {operation.label}
      </h1>
      <p className="mt-4 font-display text-4xl font-bold tracking-[-0.04em] [font-variant-numeric:tabular-nums]">
        {formatFcfa(operation.amount)}
      </p>
      <dl className="mt-5">
        <DetailRow label="Statut" value={STATUS_LABELS[operation.status] ?? operation.status} />
        <DetailRow label="Créée le" value={createdAt} />
        <DetailRow label="Moyen" value={operation.paymentMethod} />
        <DetailRow label="Référence" value={operation.reference} />
        <DetailRow label="Bénéficiaire" value={recipient} />
        <DetailRow label="Motif du rejet" value={operation.reason} />
        <DetailRow label="Corrélation" value={operation.correlationId} />
      </dl>
    </Card>
  );
}

function CancellationDialog({
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="self-start" onClick={() => setOpen(true)}>
        Annuler cette demande
      </Button>
      <Modal
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) setPin("");
        }}
        title="Annuler cette demande"
        description="La somme éventuellement réservée sera libérée après confirmation."
        className="max-w-lg"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
            Cette action est immédiate et ne peut pas être annulée. Vous pourrez créer une nouvelle
            demande si nécessaire.
          </div>
          <FormField
            id="cancel-pin"
            label="Code PIN de confirmation"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            error={error ?? undefined}
          />
          <div className="grid grid-cols-2 gap-3 border-t border-separator pt-5">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setPin("");
              }}
            >
              Retour
            </Button>
            <Button disabled={pending} onClick={submit}>
              {pending ? "Annulation…" : "Confirmer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
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
        <ArrowLeft aria-hidden /> Historiques
      </Link>
      <OperationReceipt operation={operation} />
      {operation.status === "PENDING" ? (
        <CancellationDialog
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
