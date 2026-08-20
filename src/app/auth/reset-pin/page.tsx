"use client";

import { useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

async function invokeRecovery(body: Record<string, unknown>) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke("pin-recovery", { body });
  if (error) throw error;
  return data as { status?: string; error?: string } | null;
}

function validateReset(otp: string, newPin: string, confirmPin: string) {
  if (!/^\d{6}$/.test(otp)) return "Le code reçu doit contenir 6 chiffres.";
  if (!/^\d{4,6}$/.test(newPin)) return "Le PIN doit contenir 4 à 6 chiffres.";
  if (newPin !== confirmPin) return "Les deux codes PIN ne correspondent pas.";
  return null;
}

function usePinRecovery() {
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp() {
    setBusy(true);
    setError(null);
    try {
      await invokeRecovery({ action: "request" });
      setStep("confirm");
    } catch {
      setError("Le code ne peut pas être envoyé maintenant. Réessayez dans quelques minutes.");
    } finally {
      setBusy(false);
    }
  }
  async function confirmReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const validationError = validateReset(otp, newPin, confirmPin);
    if (validationError) return setError(validationError);
    setBusy(true);
    try {
      await invokeRecovery({ action: "confirm", otp, newPin });
      setStep("done");
    } catch {
      setError("Le code est incorrect, expiré ou verrouillé.");
    } finally {
      setBusy(false);
    }
  }
  return {
    step,
    otp,
    newPin,
    confirmPin,
    error,
    busy,
    setOtp,
    setNewPin,
    setConfirmPin,
    requestOtp,
    confirmReset,
  };
}

function ConfirmationForm({ recovery }: { recovery: ReturnType<typeof usePinRecovery> }) {
  return (
    <form className="mt-4 flex flex-col gap-4" onSubmit={recovery.confirmReset}>
      <FormField
        id="reset-pin-otp"
        label="Code reçu par e-mail"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={recovery.otp}
        onChange={(event) => recovery.setOtp(event.target.value)}
      />
      <FormField
        id="reset-pin-new"
        label="Nouveau PIN"
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={recovery.newPin}
        onChange={(event) => recovery.setNewPin(event.target.value)}
      />
      <FormField
        id="reset-pin-confirm"
        label="Confirmer le nouveau PIN"
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={recovery.confirmPin}
        onChange={(event) => recovery.setConfirmPin(event.target.value)}
      />
      <Button type="submit" disabled={recovery.busy}>
        {recovery.busy ? "Vérification…" : "Enregistrer le nouveau PIN"}
      </Button>
    </form>
  );
}

export default function ResetPinPage() {
  const recovery = usePinRecovery();
  if (recovery.step === "done")
    return (
      <AuthCard title="PIN réinitialisé" subtitle="Votre nouveau code PIN est actif.">
        <a href="/client/profile" className="font-semibold text-accent underline">
          Retour à mon profil
        </a>
      </AuthCard>
    );
  return (
    <AuthCard
      title="Réinitialiser le PIN"
      subtitle="Un code à usage unique sera envoyé à l’adresse e-mail de votre compte."
    >
      <FormError message={recovery.error} />
      {recovery.step === "request" ? (
        <Button className="mt-4 w-full" onClick={recovery.requestOtp} disabled={recovery.busy}>
          {recovery.busy ? "Envoi…" : "Recevoir le code"}
        </Button>
      ) : (
        <ConfirmationForm recovery={recovery} />
      )}
    </AuthCard>
  );
}
