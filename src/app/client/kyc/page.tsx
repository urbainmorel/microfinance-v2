"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { FormError } from "@/components/auth/form-error";
import { KycStepper } from "@/components/kyc/kyc-stepper";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { SelectField } from "@/components/ui/select-field";
import { loadKyc, saveKycStep } from "@/lib/kyc-actions";
import { KYC_STEPS, kycSchema, type KycField, type KycInput } from "@/lib/schemas/kyc";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FieldMeta = {
  label: string;
  type?: string;
  inputMode?: "numeric" | "tel";
  placeholder?: string;
  options?: { value: string; label: string }[];
};

const FIELD_META: Record<KycField, FieldMeta> = {
  birth_date: { label: "Date de naissance", type: "date" },
  country: { label: "Pays de résidence", placeholder: "Ex. Côte d'Ivoire" },
  city: { label: "Ville" },
  address: { label: "Adresse précise" },
  phone: { label: "Téléphone", type: "tel", inputMode: "tel", placeholder: "+225…" },
  profession: { label: "Profession" },
  monthly_income_estimate: {
    label: "Revenu mensuel estimé (FCFA)",
    type: "number",
    inputMode: "numeric",
  },
  id_type: {
    label: "Type de pièce",
    options: [
      { value: "CNI", label: "CNI" },
      { value: "PASSPORT", label: "Passeport" },
      { value: "PERMIS", label: "Permis de conduire" },
    ],
  },
  id_number: { label: "Numéro de la pièce" },
  id_expiry: { label: "Date d'expiration", type: "date" },
  income_source: { label: "Source principale de revenus" },
  monthly_charges: { label: "Charges mensuelles (FCFA)", type: "number", inputMode: "numeric" },
  momo_operator: { label: "Opérateur Mobile Money", placeholder: "MTN, Orange, Moov…" },
  momo_number: { label: "Numéro Mobile Money", type: "tel", inputMode: "tel" },
  usual_bank: { label: "Banque habituelle" },
};

function FieldControl({ name, form }: { name: KycField; form: UseFormReturn<KycInput> }) {
  const meta = FIELD_META[name];
  const error = form.formState.errors[name]?.message;
  if (meta.options) {
    return (
      <SelectField
        id={name}
        label={meta.label}
        placeholder="Sélectionner…"
        options={meta.options}
        {...form.register(name)}
        error={error}
      />
    );
  }
  return (
    <FormField
      id={name}
      label={meta.label}
      type={meta.type}
      inputMode={meta.inputMode}
      placeholder={meta.placeholder}
      {...form.register(name)}
      error={error}
    />
  );
}

export default function KycPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const form = useForm<KycInput>({ resolver: zodResolver(kycSchema), mode: "onTouched" });

  useEffect(() => {
    void loadKyc(supabase).then((data) => form.reset(data as KycInput));
  }, [supabase, form]);

  const current = KYC_STEPS[step] ?? KYC_STEPS[0];
  const isLast = step === KYC_STEPS.length - 1;

  async function next() {
    setServerError(null);
    if (!(await form.trigger([...current.fields] as KycField[]))) return;
    try {
      await saveKycStep(supabase, current.target, current.fields, form.getValues());
      setStep((s) => Math.min(s + 1, KYC_STEPS.length - 1));
    } catch {
      setServerError("Enregistrement impossible pour le moment. Réessayez.");
    }
  }

  async function submit() {
    setServerError(null);
    const { error } = await supabase.rpc("submit_kyc");
    if (error) {
      setServerError("Soumission impossible. Vérifiez vos informations.");
      return;
    }
    router.push("/client/dashboard");
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Compléter mon profil</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Vos informations sont enregistrées à chaque étape.
      </p>
      <KycStepper steps={KYC_STEPS.map((s) => s.title)} current={step} />
      <FormError message={serverError} />
      <div className="mt-4 flex flex-col gap-4">
        {isLast ? (
          <p className="rounded-[14px] border border-border bg-card p-4 text-sm text-muted-foreground">
            Je certifie l’exactitude des informations fournies. Les pièces justificatives
            (recto/verso, selfie) seront demandées à l’activation du stockage.
          </p>
        ) : (
          current.fields.map((f) => <FieldControl key={f} name={f} form={form} />)
        )}
      </div>
      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            Retour
          </Button>
        ) : null}
        {isLast ? (
          <Button className="flex-1" onClick={submit}>
            Soumettre mon dossier KYC
          </Button>
        ) : (
          <Button className="flex-1" onClick={next}>
            Continuer
          </Button>
        )}
      </div>
    </div>
  );
}
