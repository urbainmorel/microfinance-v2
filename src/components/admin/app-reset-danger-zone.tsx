"use client";

import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executeAppReset, type ResetAppResult } from "@/lib/admin/api-reset";

interface ResetFormState {
  newBrandName: string;
  depositPhone: string;
  depositOperator: string;
  depositInstruction: string;
  confirmKeyword: string;
}

function ResetImpactSummary() {
  return (
    <div className="grid gap-3 text-xs sm:grid-cols-2">
      <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 text-red-900">
        <p className="font-semibold text-red-700">Données effacées :</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-red-800">
          <li>Tous les comptes et profils clients</li>
          <li>Crédits, contrats, échéanciers et portefeuilles</li>
          <li>Dépôts, retraits et remboursements</li>
          <li>Pièces justificatives KYC et stockage Supabase</li>
          <li>Conversations de support et FAQ chatbot</li>
        </ul>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-emerald-900">
        <p className="font-semibold text-emerald-700">Éléments conservés :</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-emerald-800">
          <li>Votre compte administrateur actuel (connexion maintenue)</li>
          <li>Vos paramètres de produits de crédit (taux, durées, montants)</li>
          <li>La structure technique et les tables de la base de données</li>
          <li>Le journal d&apos;audit (avec trace de la réinitialisation)</li>
        </ul>
      </div>
    </div>
  );
}

function ResetConfirmDialog({
  isOpen,
  brandName,
  isExecuting,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  brandName: string;
  isExecuting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-destructive">
          <ShieldAlert className="size-6 shrink-0" />
          <h3 className="text-base font-bold">Confirmation solennelle</h3>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Êtes-vous absolument certain de vouloir réinitialiser l&apos;application et déployer la
          marque <strong className="text-foreground">{brandName}</strong> ? Cette opération est{" "}
          <strong className="text-destructive">irréversible</strong>.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExecuting}>
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isExecuting}
            className="gap-2 bg-red-600 text-white hover:bg-red-700"
          >
            {isExecuting ? <RefreshCw className="size-4 animate-spin" /> : null}
            {isExecuting ? "Réinitialisation..." : "Confirmer la réinitialisation"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResetFormInputs({
  form,
  currentBrand,
  isBusy,
  canSubmit,
  onChange,
  onSubmitRequest,
}: {
  form: ResetFormState;
  currentBrand: string;
  isBusy: boolean;
  canSubmit: boolean;
  onChange: (field: keyof ResetFormState, val: string) => void;
  onSubmitRequest: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nouveau nom officiel de la marque *
          </label>
          <Input
            type="text"
            placeholder={`Ex : Nouvelle Marque (actuel: ${currentBrand})`}
            value={form.newBrandName}
            onChange={(e) => onChange("newBrandName", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Numéro Mobile Money de dépôt (optionnel)
          </label>
          <Input
            type="tel"
            placeholder="Ex : +22507XXXXXXXX"
            value={form.depositPhone}
            onChange={(e) => onChange("depositPhone", e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Mot-clé de confirmation de sécurité *
        </label>
        <p className="text-xs text-muted-foreground">
          Saisissez rigoureusement <strong className="text-destructive">REINITIALISER</strong> pour
          débloquer l&apos;opération :
        </p>
        <Input
          type="text"
          placeholder="REINITIALISER"
          value={form.confirmKeyword}
          onChange={(e) => onChange("confirmKeyword", e.target.value)}
          className="mt-1.5 max-w-xs font-mono font-bold tracking-wider"
        />
      </div>

      <Button
        size="sm"
        disabled={!canSubmit || isBusy}
        onClick={onSubmitRequest}
        className="gap-2 bg-red-600 text-white hover:bg-red-700"
      >
        <AlertTriangle className="size-4" />
        Réinitialiser et déployer la nouvelle marque
      </Button>
    </div>
  );
}

function ResetSuccessAlert({ result }: { result: ResetAppResult }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
      <h4 className="text-sm font-bold">Réinitialisation terminée avec succès !</h4>
      <p className="mt-1 text-xs">{result.message}</p>
      <p className="mt-2 text-xs font-semibold">
        {result.purgedClients} compte(s) client(s) purgé(s), {result.purgedFiles} fichier(s) de
        stockage supprimé(s).
      </p>
      <Button
        size="sm"
        className="mt-3 bg-emerald-700 text-white hover:bg-emerald-800"
        onClick={() => window.location.reload()}
      >
        Recharger l&apos;application
      </Button>
    </div>
  );
}

export function AppResetDangerZone({ currentBrand }: { currentBrand: string }) {
  const [form, setForm] = useState<ResetFormState>({
    newBrandName: "",
    depositPhone: "",
    depositOperator: "",
    depositInstruction: "",
    confirmKeyword: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState<ResetAppResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    form.newBrandName.trim().length >= 2 && form.confirmKeyword.trim() === "REINITIALISER";

  const handleExecute = async () => {
    try {
      setIsBusy(true);
      setError(null);
      const res = await executeAppReset({
        newBrandName: form.newBrandName,
        depositPhone: form.depositPhone || undefined,
        depositOperator: form.depositOperator || undefined,
        depositInstruction: form.depositInstruction || undefined,
        confirmationKeyword: form.confirmKeyword,
      });
      setResult(res);
      setIsModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Échec de la réinitialisation.");
      setIsModalOpen(false);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="mt-12 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-destructive">
            Zone de danger : Réinitialisation & Changement de marque
          </h2>
          <p className="text-xs text-muted-foreground">
            Remettez l&apos;application à zéro sous une nouvelle identité tout en conservant la même
            base Supabase.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <ResetImpactSummary />
        {result ? <ResetSuccessAlert result={result} /> : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        ) : null}
        {!result ? (
          <ResetFormInputs
            form={form}
            currentBrand={currentBrand}
            isBusy={isBusy}
            canSubmit={canSubmit}
            onChange={(field, val) => setForm((prev) => ({ ...prev, [field]: val }))}
            onSubmitRequest={() => setIsModalOpen(true)}
          />
        ) : null}
      </div>

      <ResetConfirmDialog
        isOpen={isModalOpen}
        brandName={form.newBrandName}
        isExecuting={isBusy}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => void handleExecute()}
      />
    </section>
  );
}
