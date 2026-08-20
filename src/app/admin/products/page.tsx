"use client";

import { Plus } from "lucide-react";

import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  MutationFeedback,
} from "@/components/admin/admin-page";
import { useAdminRole } from "@/components/admin/admin-role-context";
import { ProductForm } from "@/components/admin/product-form";
import { ProductList } from "@/components/admin/product-list";
import { Button } from "@/components/ui/button";
import { useProductManagement } from "@/lib/admin/use-product-management";

function canCreateProduct(editable: boolean, editing: boolean, productCount?: number) {
  return editable && !editing && (productCount ?? 2) < 2;
}

export default function AdminProductsPage() {
  const manager = useProductManagement();
  const { can } = useAdminRole();
  const editable = can("products");
  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Produits de prêt"
        description="Configurez les bornes, frais et garanties. Un produit utilisé est désactivé, jamais supprimé."
        action={
          canCreateProduct(editable, Boolean(manager.editing), manager.query.data?.length) ? (
            <Button type="button" size="sm" onClick={() => manager.setEditing("new")}>
              <Plus className="size-4" /> Nouveau produit
            </Button>
          ) : undefined
        }
      />
      {manager.editing ? (
        <div className="mb-6">
          <ProductForm
            key={manager.editing === "new" ? "new" : manager.editing.id}
            product={manager.editing === "new" ? undefined : manager.editing}
            busy={manager.mutation.isPending}
            onSave={manager.save}
            onCancel={() => manager.setEditing(null)}
          />
          <MutationFeedback error={manager.mutation.error} success={manager.mutation.isSuccess} />
        </div>
      ) : null}
      {manager.query.isPending ? <AdminLoading /> : null}
      {manager.query.isError ? <AdminError message={manager.query.error.message} /> : null}
      {manager.query.data?.length === 0 ? <AdminEmpty label="Aucun produit de prêt" /> : null}
      <ProductList
        products={manager.query.data ?? []}
        editable={editable}
        busy={manager.mutation.isPending}
        edit={manager.setEditing}
        deactivate={manager.deactivate}
      />
    </>
  );
}
