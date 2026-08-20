"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function submit(values: ForgotPasswordInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) {
      setServerError("Impossible d'envoyer le lien pour le moment. Réessayez plus tard.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard title="Mot de passe oublié" subtitle="Recevez un lien sécurisé par email.">
      {sent ? (
        <div className="space-y-5 text-center">
          <p role="status" className="text-sm text-muted-foreground">
            Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être
            envoyé. Vérifiez également vos courriers indésirables.
          </p>
          <Link href="/auth/login" className={cn(buttonVariants(), "w-full")}>
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
          <FormError message={serverError} />
          <FormField
            id="email"
            label="Adresse email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Envoi…" : "Envoyer le lien"}
          </Button>
          <Link href="/auth/login" className="text-center text-sm font-medium text-accent">
            Retour à la connexion
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
