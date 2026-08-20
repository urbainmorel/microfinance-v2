"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { KycStatusBadge } from "@/components/dashboard/kyc-status-badge";
import { useClientLocale } from "@/components/i18n/client-locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">{t("profile.title")}</h1>
        <LanguageSwitcher />
      </div>
      <Card className="flex flex-col gap-1">
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
        className="flex min-h-11 items-center justify-center rounded-[14px] border border-border px-4 text-sm font-semibold text-accent"
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
