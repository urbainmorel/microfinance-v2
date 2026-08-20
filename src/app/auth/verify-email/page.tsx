"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { resolvePostAuthPath } from "@/lib/auth-flow";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    async function continueIfVerified() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (active && user?.email_confirmed_at) {
        window.sessionStorage.removeItem("pending-verification-email");
        router.replace(await resolvePostAuthPath(supabase));
        router.refresh();
      }
    }
    void continueIfVerified();
    return () => {
      active = false;
    };
  }, [router]);

  async function resend() {
    setPending(true);
    setStatus("idle");
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = user?.email ?? window.sessionStorage.getItem("pending-verification-email");
    if (!email) {
      setStatus("error");
      setPending(false);
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setStatus(error ? "error" : "sent");
    setPending(false);
  }

  return (
    <AuthCard title="Vérifiez votre email" subtitle="Un lien de vérification vous a été envoyé.">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          Cliquez sur le lien reçu pour activer votre compte. Vous reprendrez automatiquement la
          création de votre espace sécurisé.
        </p>
        {status === "sent" ? (
          <p className="text-sm font-medium text-accent">Email de vérification renvoyé.</p>
        ) : null}
        {status === "error" ? (
          <FormError message="Impossible de renvoyer l'email pour le moment." />
        ) : null}
        <Button variant="outline" className="w-full" onClick={resend} disabled={pending}>
          {pending ? "Envoi…" : "Renvoyer le lien"}
        </Button>
        <Link href="/auth/login" className="text-sm font-semibold text-accent hover:underline">
          Retour à la connexion
        </Link>
      </div>
    </AuthCard>
  );
}
