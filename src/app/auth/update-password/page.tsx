"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { updatePasswordSchema, type UpdatePasswordInput } from "@/lib/schemas/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type RecoveryState = "checking" | "ready" | "invalid" | "updated";

function RecoveryNotice({ state }: { state: RecoveryState }) {
  if (state === "checking") return <p role="status">Vérification du lien…</p>;
  if (state === "invalid") {
    return (
      <div className="space-y-5 text-center">
        <FormError message="Ce lien est invalide ou expiré." />
        <Link href="/auth/forgot-password" className={cn(buttonVariants(), "w-full")}>
          Demander un nouveau lien
        </Link>
      </div>
    );
  }
  if (state === "updated") {
    return (
      <div className="space-y-5 text-center">
        <p role="status" className="text-sm text-muted-foreground">
          Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.
        </p>
        <Link href="/auth/login" className={cn(buttonVariants(), "w-full")}>
          Se connecter
        </Link>
      </div>
    );
  }
  return null;
}

export default function UpdatePasswordPage() {
  const [state, setState] = useState<RecoveryState>("checking");
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) });

  useEffect(() => {
    let active = true;
    async function prepareRecovery() {
      const supabase = createSupabaseBrowserClient();
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) setState("invalid");
          return;
        }
        window.history.replaceState({}, "", window.location.pathname);
      }
      const { data } = await supabase.auth.getSession();
      if (active) setState(data.session ? "ready" : "invalid");
    }
    void prepareRecovery();
    return () => {
      active = false;
    };
  }, []);

  async function submit(values: UpdatePasswordInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError("Le mot de passe n'a pas pu être modifié. Demandez un nouveau lien.");
      return;
    }
    await supabase.auth.signOut();
    setState("updated");
  }

  return (
    <AuthCard title="Nouveau mot de passe" subtitle="Choisissez un nouveau secret de connexion.">
      <RecoveryNotice state={state} />
      {state === "ready" ? (
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
          <FormError message={serverError} />
          <FormField
            id="password"
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />
          <FormField
            id="confirm"
            label="Confirmer le mot de passe"
            type="password"
            autoComplete="new-password"
            {...form.register("confirm")}
            error={form.formState.errors.confirm?.message}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Modification…" : "Modifier le mot de passe"}
          </Button>
        </form>
      ) : null}
    </AuthCard>
  );
}
