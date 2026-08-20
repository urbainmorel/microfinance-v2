"use client";

import { ProductFormFields } from "@/components/admin/product-form-fields";
import { useProductForm } from "@/components/admin/use-product-form";
import { Button } from "@/components/ui/button";

import type { LoanProduct, LoanProductInput } from "@/lib/admin/types";

export function ProductForm({
  product,
  busy,
  onSave,
  onCancel,
}: {
  product?: LoanProduct;
  busy: boolean;
  onSave: (input: LoanProductInput) => void;
  onCancel: () => void;
}) {
  const form = useProductForm(product, onSave);
  return (
    <form
      onSubmit={form.submit}
      className="rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold">
          {product ? "Modifier le produit" : "Nouveau produit"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les nouveaux produits restent inactifs jusqu’à validation métier.
        </p>
      </div>
      <ProductFormFields value={form.value} setValue={form.setField} />
      <label className="mt-5 flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={form.value.isActive}
          onChange={(event) => form.setField("isActive", event.target.checked)}
          className="size-5 accent-[hsl(var(--accent))]"
        />
        Produit actif et visible par les clients
      </label>
      {form.error ? (
        <p className="mt-4 text-sm font-medium text-[hsl(var(--gold))]">{form.error}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
