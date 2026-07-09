"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { firstname: values.firstname, lastname: values.lastname } },
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push("/auth/verify-email");
  }

  return (
    <AuthCard title="Créer un compte" subtitle="Ouvrez votre espace client en quelques étapes.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormError message={serverError} />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="firstname"
            label="Prénom"
            {...register("firstname")}
            error={errors.firstname?.message}
          />
          <FormField
            id="lastname"
            label="Nom"
            {...register("lastname")}
            error={errors.lastname?.message}
          />
        </div>
        <FormField
          id="email"
          label="Adresse email"
          type="email"
          autoComplete="email"
          {...register("email")}
          error={errors.email?.message}
        />
        <FormField
          id="password"
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          error={errors.password?.message}
        />
        <FormField
          id="confirm"
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          {...register("confirm")}
          error={errors.confirm?.message}
        />
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà client ?{" "}
        <Link href="/auth/login" className="font-semibold text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
