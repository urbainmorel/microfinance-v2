import { QuickActions } from "@/components/client/quick-actions";
import { OperationsList } from "@/components/operations/operations-list";
import { PageHeader } from "@/components/ui/page-header";

export default function OperationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Historiques"
        description="Consultez votre historique et lancez une nouvelle opération en quelques étapes."
      />
      <QuickActions />
      <h2 className="font-display text-lg font-bold tracking-[-0.02em] text-foreground">
        Historique
      </h2>
      <OperationsList />
    </div>
  );
}
