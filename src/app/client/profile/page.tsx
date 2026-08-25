"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { KycStatusBadge } from "@/components/dashboard/kyc-status-badge";
import { useClientLocale } from "@/components/i18n/client-locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useProfile } from "@/lib/hooks/use-profile";
import { useSessionUser } from "@/lib/hooks/use-session-user";
import { useSupabase } from "@/lib/hooks/use-supabase";

export default function ProfilePage() {
  const supabase = useSupabase();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: user } = useSessionUser();
  const { t } = useClientLocale();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("profile.title")}
        description="Gérez vos préférences et la sécurité de votre compte."
        action={<LanguageSwitcher />}
      />
      <Card className="flex flex-col gap-1 p-6">
        <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-finance-soft font-display text-lg font-bold text-accent">
          {(profile?.firstname ?? "—").slice(0, 1).toUpperCase()}
        </div>
        <p className="text-lg font-bold text-foreground">{profile?.firstname ?? "—"}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        {profile ? (
          <div>
            <KycStatusBadge status={profile.kyc_status} />
          </div>
        ) : null}
      </Card>
      <Link
        href="/auth/reset-pin"
        className="flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-accent shadow-card transition-colors hover:bg-muted"
      >
        {t("profile.resetPin")}
      </Link>
      <Button variant="outline" onClick={logout}>
        <LogOut className="size-4" aria-hidden />
        {t("profile.logout")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("profile.privacy")}</p>
    </div>
  );
}
