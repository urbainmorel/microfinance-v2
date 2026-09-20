"use client";

import { useQuery } from "@tanstack/react-query";

import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  MutationFeedback,
} from "@/components/admin/admin-page";
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
      />
      {query.isPending ? <AdminLoading /> : null}
      {query.isError ? <AdminError message={query.error.message} /> : null}
      {query.data ? (
        <SettingsForm
          initial={query.data}
          busy={mutation.isPending}
          onSave={(value) => mutation.mutate(value)}
        />
      ) : null}
      <MutationFeedback error={mutation.error} success={mutation.isSuccess} />
    </>
  );
}
