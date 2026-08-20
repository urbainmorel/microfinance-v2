"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Receipt, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFcfa } from "@/lib/format";
import { useSupabase } from "@/lib/hooks/use-supabase";

const PAGE_SIZE = 20;

type OperationRow = {
  id: string;
  operation_type?: string;
  type?: string;
  amount: number;
  status: string;
  label: string;
  created_at?: string;
  operation_date?: string;
};

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Dépôt",
  WITHDRAWAL: "Retrait",
  MOBILE_MONEY: "Retrait Mobile Money",
  BANK_TRANSFER: "Virement bancaire",
  REPAYMENT: "Remboursement",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PROCESSING: "En traitement",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  REJECTED: "Rejetée",
  CANCELLED: "Annulée",
};

function operationDate(row: OperationRow) {
  return row.created_at ?? row.operation_date ?? new Date().toISOString();
}

function OperationItem({ operation }: { operation: OperationRow }) {
  const type = operation.operation_type ?? operation.type ?? "OPERATION";
  const Icon = type === "DEPOSIT" ? ArrowDownLeft : ArrowUpRight;
  return (
    <li>
      <Card className="flex items-center gap-3 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-pastel-green text-accent">
          <Icon className="size-5" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {operation.label || TYPE_LABELS[type] || "Opération"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(operationDate(operation)),
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-sm font-bold text-foreground">
            {formatFcfa(operation.amount)}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            {STATUS_LABELS[operation.status] ?? operation.status}
          </p>
        </div>
      </Card>
    </li>
  );
}

function OperationsContent({
  operations,
  hasMore,
  loadingMore,
  loadMore,
}: {
  operations: OperationRow[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
}) {
  if (!operations.length)
    return (
      <EmptyState
        icon={Receipt}
        title="Aucune opération"
        hint="Vos dépôts, retraits et remboursements apparaîtront ici."
      />
    );
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3" aria-label="Historique des opérations">
        {operations.map((operation) => (
          <OperationItem
            key={`${operation.operation_type}-${operation.id}`}
            operation={operation}
          />
        ))}
      </ul>
      {hasMore ? (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore} aria-busy={loadingMore}>
          {loadingMore ? "Chargement…" : "Afficher plus"}
        </Button>
      ) : null}
    </div>
  );
}

export function OperationsList() {
  const supabase = useSupabase();
  const query = useInfiniteQuery({
    queryKey: ["client-operations"],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<OperationRow[]> => {
      const { data, error } = await supabase.rpc("get_client_operations", {
        p_limit: PAGE_SIZE,
        p_before: pageParam,
      });
      if (error) throw error;
      return (data ?? []) as OperationRow[];
    },
    getNextPageParam: (lastPage) => {
      const lastOperation = lastPage.at(-1);
      return lastPage.length === PAGE_SIZE && lastOperation
        ? operationDate(lastOperation)
        : undefined;
    },
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-label="Chargement des opérations">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-[88px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col gap-3">
        <EmptyState
          icon={AlertCircle}
          title="Opérations indisponibles"
          hint="La liste n’a pas pu être chargée."
        />
        <Button variant="outline" onClick={() => void query.refetch()}>
          <RotateCcw aria-hidden /> Réessayer
        </Button>
      </div>
    );
  }

  return (
    <OperationsContent
      operations={query.data.pages.flat()}
      hasMore={Boolean(query.hasNextPage)}
      loadingMore={query.isFetchingNextPage}
      loadMore={() => void query.fetchNextPage()}
    />
  );
}
