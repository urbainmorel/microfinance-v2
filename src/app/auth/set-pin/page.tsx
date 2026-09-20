"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { resolvePostAuthPath } from "@/lib/auth-flow";
import { setPinSchema, type SetPinInput } from "@/lib/schemas/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SetPinPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPinInput>({ resolver: zodResolver(setPinSchema) });

  async function onSubmit(values: SetPinInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.functions.invoke("set-pin", { body: { pin: values.pin } });
    if (error) {
      setServerError("Impossible d'enregistrer le code PIN. Réessayez.");
      return;
    }
    router.replace(await resolvePostAuthPath(supabase));
    router.refresh();
  }

  return (
    <AuthCard
      title="Créer votre code PIN"
      subtitle="4 à 6 chiffres, demandés avant chaque opération."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormError message={serverError} />
        <FormField
          id="pin"
          label="Code PIN"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          {...register("pin", {
            onChange: () => {
              if (serverError) setServerError(null);
            },
          })}
          error={errors.pin?.message}
        />
        <FormField
          id="confirm"
          label="Confirmer le code PIN"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          {...register("confirm", {
            onChange: () => {
              if (serverError) setServerError(null);
            },
          })}
          error={errors.confirm?.message}
        />
        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement…" : "Enregistrer mon code PIN"}
        </Button>
      </form>
    </AuthCard>
  );
}
