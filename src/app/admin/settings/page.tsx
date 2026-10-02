"use client";

import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import Link from "next/link";

import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  MutationFeedback,
} from "@/components/admin/admin-page";
import { AppResetDangerZone } from "@/components/admin/app-reset-danger-zone";
import { SettingsForm } from "@/components/admin/settings-form";
import { getAppSettings, saveAppSettings } from "@/lib/admin/api-settings";
import { useAdminMutation } from "@/lib/admin/hooks";

const SETTINGS_KEY = ["admin", "settings"] as const;

export default function AdminSettingsPage() {
  const query = useQuery({ queryKey: SETTINGS_KEY, queryFn: getAppSettings });
  const mutation = useAdminMutation(saveAppSettings, [
    SETTINGS_KEY,
    ["app_settings", "platform_name"],
    ["app_settings"],
  ]);
  return (
    <>
      <AdminPageHeader
        eyebrow="Configuration"
        title="Paramètres généraux"
        description="Définissez les plages opérationnelles, frais fixes et durées de conservation."
        action={
          <Link
            href="/admin/storage"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <HardDrive className="size-4 text-primary" />
            Gérer le stockage (1 Go)
          </Link>
        }
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data ? (
        <>
          <SettingsForm
            initial={query.data}
            busy={mutation.isPending}
            onSave={(value) => mutation.mutate(value)}
          />
          <AppResetDangerZone currentBrand={query.data.platformName} />
        </>
      ) : null}
      <MutationFeedback error={mutation.error} success={mutation.isSuccess} />
    </>
  );
}
