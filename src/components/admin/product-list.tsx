import { ToggleLeft } from "lucide-react";

import { QueueCard } from "@/components/admin/queue-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/admin/format";
import { cleanProductDescription } from "@/lib/format";

import type { LoanProduct } from "@/lib/admin/types";

function ProductActions({
  product,
  busy,
  edit,
  deactivate,
}: {
  product: LoanProduct;
  busy: boolean;
  edit: (product: LoanProduct) => void;
  deactivate: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => edit(product)}
        disabled={busy}
      >
        Modifier
      </Button>
      {product.isActive ? (
        <Button type="button" size="sm" onClick={() => deactivate(product.id)} disabled={busy}>
          <ToggleLeft className="size-4" /> Désactiver
        </Button>
      ) : null}
    </div>
  );
}

export function ProductList({
  products,
  editable,
  busy,
  edit,
  deactivate,
}: {
  products: LoanProduct[];
  editable: boolean;
  busy: boolean;
  edit: (product: LoanProduct) => void;
  deactivate: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {products.map((product) => (
        <QueueCard
          key={product.id}
          title={product.name}
          subtitle={cleanProductDescription(product.description) ?? "Sans description"}
          status={<StatusBadge status={product.isActive ? "ACTIVE" : "CANCELLED"} />}
          facts={[
            {
              label: "Montants",
              value: `${formatCurrency(product.minAmount)} à ${formatCurrency(product.maxAmount)}`,
            },
            {
              label: "Durées",
              value: `${product.minDurationMonths} à ${product.maxDurationMonths} mois`,
            },
            { label: "Taux annuel", value: `${product.interestRate} %` },
            { label: "Garantie", value: `${product.guaranteeRate}%` },
            { label: "Épargne obligatoire", value: `${product.mandatorySavingsRate}%` },
            { label: "Créé le", value: formatDate(product.createdAt) },
          ]}
        >
          {editable ? (
            <ProductActions product={product} busy={busy} edit={edit} deactivate={deactivate} />
          ) : (
            <p className="text-sm text-muted-foreground">Consultation en lecture seule.</p>
          )}
        </QueueCard>
      ))}
    </div>
  );
}
