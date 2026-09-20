"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <Link href="/auth/forgot-password" className="font-medium text-accent hover:underline">
          Mot de passe oublié ?
        </Link>
        <p className="text-muted-foreground">
          Nouveau client ?{" "}
          <Link href="/auth/register" className="font-semibold text-accent hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
