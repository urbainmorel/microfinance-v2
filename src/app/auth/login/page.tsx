"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { FormSuccess } from "@/components/auth/form-success";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
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

function sanitizeEmailParam(param: string | null): string | null {
  if (!param) return null;
  const trimmed = param.trim();
  if (trimmed.length > 254 || !trimmed.includes("@")) return null;
  return trimmed;
}

function resolveUrlStatus(searchParams: ReturnType<typeof useSearchParams>): {
  successMessage: string | null;
  errorMessage: string | null;
} {
  const isVerified =
    searchParams.get("verified") === "true" || searchParams.get("reason") === "verified";
  const reason = searchParams.get("reason");
  const error = searchParams.get("error");

  let errorMessage: string | null = null;
  if (
    error === "verification_failed" ||
    reason === "verification_failed" ||
    reason === "verification"
  ) {
    errorMessage =
      "Ce lien de confirmation est invalide ou a expiré. Si votre compte est déjà activé, vous pouvez vous connecter ci-dessous.";
  } else if (reason === "disabled") {
    errorMessage = "Ce compte est désactivé. Contactez le chef d’agence.";
  } else if (reason === "session") {
    errorMessage = "Votre session a expiré. Veuillez vous reconnecter.";
  }

  return {
    successMessage: isVerified ? "Email vérifié ! Connectez-vous pour continuer." : null,
    errorMessage,
  };
}

function LoginFormInputs({
  register,
  errors,
  isSubmitting,
}: {
  register: UseFormRegister<LoginInput>;
  errors: FieldErrors<LoginInput>;
  isSubmitting: boolean;
}) {
  return (
    <>
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
          className="text-xs font-semibold text-accent transition-colors hover:text-accent-deep hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>
      <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Connexion…" : "Se connecter"}
      </Button>
    </>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const emailParam = sanitizeEmailParam(searchParams.get("email"));
  const urlStatus = useMemo(() => resolveUrlStatus(searchParams), [searchParams]);

  const serverError = submissionError ?? urlStatus.errorMessage;
  const successMessage = submissionError ? null : urlStatus.successMessage;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailParam ?? "", password: "" },
  });

  useEffect(() => {
    if (!emailParam && typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("pending-verification-email");
      if (stored) setValue("email", stored, { shouldValidate: false });
    }
  }, [emailParam, setValue]);

  async function onSubmit(values: LoginInput) {
    try {
      setSubmissionError(null);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) return setSubmissionError("Email ou mot de passe incorrect.");

      const { data: claimsData } = await supabase.auth.getClaims();
      if (isAccountInactive(claimsData?.claims?.app_metadata)) {
        await supabase.auth.signOut();
        return setSubmissionError("Ce compte est désactivé. Contactez le chef d’agence.");
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("pending-verification-email");
      }
      window.location.assign(await resolvePostAuthPath(supabase));
    } catch {
      setSubmissionError("Connexion impossible pour le moment. Veuillez vérifier votre réseau.");
    }
  }

  return (
    <AuthCard title="Connexion" subtitle="Accédez à votre espace sécurisé.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormSuccess message={successMessage} />
        <FormError message={serverError} />
        <LoginFormInputs register={register} errors={errors} isSubmitting={isSubmitting} />
      </form>
      <CreateAccountPrompt />
    </AuthCard>
  );
}

function LoginFormFallback() {
  return (
    <AuthCard title="Connexion" subtitle="Accédez à votre espace sécurisé.">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
