import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function OperationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-foreground">Mes opérations</h1>
      <EmptyState
        icon={Receipt}
        title="Aucune opération"
        hint="Vos dépôts, retraits et remboursements apparaîtront ici."
      />
    </div>
  );
}
