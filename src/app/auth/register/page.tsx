"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PRIVACY_POLICY_VERSION = "privacy-v1";

function RegisterFields({
  register,
  errors,
}: {
  register: UseFormRegister<RegisterInput>;
  errors: FieldErrors<RegisterInput>;
}) {
  return (
    <>
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
      <label className="flex min-h-11 items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-[hsl(var(--accent))]"
          {...register("consentAccepted")}
        />
        <span>
          J’accepte la{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-accent underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      {errors.consentAccepted ? (
        <p className="text-xs font-medium text-warning">{errors.consentAccepted.message}</p>
      ) : null}
    </>
  );
}

function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function submit(values: RegisterInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          firstname: values.firstname,
          lastname: values.lastname,
          consent_accepted: values.consentAccepted,
          privacy_policy_version: PRIVACY_POLICY_VERSION,
        },
      },
    });
    if (error) return setServerError(error.message);
    router.push("/auth/verify-email");
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <FormError message={serverError} />
      <RegisterFields register={form.register} errors={form.formState.errors} />
      <Button type="submit" className="mt-2 w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthCard title="Créer un compte" subtitle="Ouvrez votre espace client en quelques étapes.">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà client ?{" "}
        <Link href="/auth/login" className="font-semibold text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
