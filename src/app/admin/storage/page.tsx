import { AdminPageHeader } from "@/components/admin/admin-page";
import { StorageCleaner } from "@/components/admin/storage-cleaner";

export default function AdminStoragePage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Infrastructure & Données"
        title="Gestion du stockage"
        description="Surveillez l'occupation de votre quota de 1 Go Supabase et purgez les fichiers de documents archivés sur une plage de dates donnée."
      />
      <StorageCleaner />
    </>
  );
}
