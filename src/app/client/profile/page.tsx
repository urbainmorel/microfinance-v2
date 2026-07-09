"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { KycStatusBadge } from "@/components/dashboard/kyc-status-badge";
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

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-foreground">Profil</h1>
      <Card className="flex flex-col gap-1">
        <p className="text-lg font-bold text-foreground">{profile?.firstname ?? "—"}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        {profile ? (
          <div>
            <KycStatusBadge status={profile.kyc_status} />
          </div>
        ) : null}
      </Card>
      <Button variant="outline" onClick={logout}>
        <LogOut className="size-4" aria-hidden />
        Se déconnecter
      </Button>
      <p className="text-xs text-muted-foreground">Le sélecteur de langue arrive au Lot 9.</p>
    </div>
  );
}
