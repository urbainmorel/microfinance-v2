import { Loader2, Trash2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { formatBytes } from "@/lib/admin/storage-utils";

interface ConfirmModalProps {
  open: boolean;
  isPurging: boolean;
  count: number;
  bytes: number;
  startDate: string;
  endDate: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function StorageConfirmModal({
  open,
  isPurging,
  count,
  bytes,
  startDate,
  endDate,
  onOpenChange,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirmer la suppression définitive"
      description="Cette action effacera les fichiers sélectionnés de l'espace Supabase Storage."
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-900">
          <p className="font-bold">Attention :</p>
          <p className="mt-1">
            Vous êtes sur le point de supprimer <strong>{count} fichier(s)</strong> (
            {formatBytes(bytes)}) créés entre le <strong>{startDate}</strong> et le{" "}
            <strong>{endDate}</strong>.
          </p>
          <p className="mt-2 text-xs text-rose-700">
            Ces fichiers ne seront plus disponibles en ligne. Vérifiez qu&apos;ils sont conservés
            dans vos sauvegardes locales.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPurging}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPurging}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
          >
            {isPurging ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Suppression…
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden="true" /> Confirmer la suppression
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
