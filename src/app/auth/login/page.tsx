"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { isAccountInactive } from "@/lib/access-control";
import { resolvePostAuthPath } from "@/lib/auth-flow";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function CreateAccountPrompt() {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-card px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nouveau sur Azari ?
        </span>
      </div>

      <Link
        href="/auth/register"
        className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-accent/30 bg-accent/5 px-4 font-display text-sm font-bold text-accent shadow-sm transition-all duration-200 hover:border-accent hover:bg-accent hover:text-white active:translate-y-px"
      >
        <UserPlus className="size-4" strokeWidth={2} />
        <span>Créer un compte</span>
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    try {
      setServerError(null);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        setServerError("Email ou mot de passe incorrect.");
        return;
      }
      const { data: claimsData } = await supabase.auth.getClaims();
      if (isAccountInactive(claimsData?.claims?.app_metadata)) {
        await supabase.auth.signOut();
        setServerError("Ce compte est désactivé. Contactez le chef d’agence.");
        return;
      }
      const target = await resolvePostAuthPath(supabase);
      window.location.assign(target);
    } catch (err: unknown) {
      console.error("Login submission error:", err);
      setServerError(
        "Connexion impossible pour le moment. Veuillez vérifier votre connexion réseau.",
      );
    }
  }

  return (
    <AuthCard title="Connexion" subtitle="Accédez à votre espace sécurisé.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormError message={serverError} />
        <FormField
          id="email"
          label="Adresse email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          {...register("email")}
          error={errors.email?.message}
        />
        <FormField
          id="password"
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
          error={errors.password?.message}
        />
        <div className="-mt-1 flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="hover:text-accent-deep text-xs font-semibold text-accent transition-colors hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <CreateAccountPrompt />
    </AuthCard>
  );
}
