"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormStepper } from "@/components/ui/form-stepper";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PRIVACY_POLICY_VERSION = "privacy-v1";

const REGISTER_STEPS = [{ label: "Profil" }, { label: "Sécurité" }] as const;

function IdentityFields({ form }: { form: UseFormReturn<RegisterInput> }) {
  const { register, formState } = form;
  const { errors } = formState;
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
    </>
  );
}

function SecurityFields({ form }: { form: UseFormReturn<RegisterInput> }) {
  const { register, formState } = form;
  const { errors } = formState;
  return (
    <>
      <input
        type="email"
        name="username"
        autoComplete="username"
        value={form.getValues("email")}
        readOnly
        hidden
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
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function continueToSecurity() {
    const valid = await form.trigger(["firstname", "lastname", "email"]);
    if (valid) setStep(1);
  }

  async function submit(values: RegisterInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          firstname: values.firstname,
          lastname: values.lastname,
          consent_accepted: values.consentAccepted,
          privacy_policy_version: PRIVACY_POLICY_VERSION,
        },
      },
    });
    if (error) return setServerError(error.message);
    window.sessionStorage.setItem("pending-verification-email", values.email);
    router.push("/auth/verify-email");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (step === 0) {
      event.preventDefault();
      void continueToSecurity();
      return;
    }
    void form.handleSubmit(submit)(event);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <FormStepper steps={REGISTER_STEPS} currentStep={step} className="border-0 bg-muted/55" />
      <FormError message={serverError} />
      {step === 0 ? <IdentityFields form={form} /> : <SecurityFields form={form} />}
      {step === 0 ? (
        <Button type="submit" className="mt-1 w-full">
          Continuer
        </Button>
      ) : (
        <div className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-3">
          <Button type="button" variant="outline" onClick={() => setStep(0)}>
            Retour
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Création…" : "Créer mon compte"}
          </Button>
        </div>
      )}
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
