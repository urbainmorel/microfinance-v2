"use client";

import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { KycStepBody } from "@/components/kyc/kyc-step-body";
import { KycStepper } from "@/components/kyc/kyc-stepper";
import { KycVerificationModal, type KycModalState } from "@/components/kyc/kyc-verification-modal";
import { useKycWizard } from "@/components/kyc/use-kyc-wizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { KYC_STEPS } from "@/lib/schemas/kyc";

import type { AiDecisionReport } from "@/lib/kyc-ai";

type VerifyResponse = {
  status?: string;
  reason?: string;
  error?: string;
  report?: AiDecisionReport | null;
};

async function executeAutoVerify(): Promise<VerifyResponse> {
  const res = await fetch("/api/kyc/auto-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

function resolveVerifyError(data: VerifyResponse): string {
  return (
    data.reason ||
    data.error ||
    "La vérification automatique par IA n'a pas pu valider votre dossier."
  );
}

function KycNavigationButtons({
  step,
  isConfirm,
  certified,
  submitting,
  verifyingAi,
  onBack,
  onNext,
  onSubmit,
}: {
  step: number;
  isConfirm: boolean;
  certified: boolean;
  submitting: boolean;
  verifyingAi: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const isBusy = submitting || verifyingAi;

  return (
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-separator pt-5 sm:mt-8 sm:flex-row sm:justify-between">
      {step > 0 ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isBusy}
          className="w-full sm:w-auto sm:min-w-28"
        >
          Retour
        </Button>
      ) : (
        <div />
      )}
      {isConfirm ? (
        <Button
          type="button"
          variant="accent"
          className="w-full sm:w-auto sm:min-w-56"
          onClick={onSubmit}
          disabled={!certified || isBusy}
        >
          {isBusy ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {verifyingAi ? "Vérification IA…" : "Envoi…"}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Valider mon identité par IA
            </span>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="accent"
          className="w-full sm:w-auto sm:min-w-40"
          onClick={onNext}
        >
          Continuer
        </Button>
      )}
    </div>
  );
}

function KycRejectedBanner({
  aiError,
  onOpenModal,
}: {
  aiError: string | null;
  onOpenModal: () => void;
}) {
  if (!aiError) return null;
  return (
    <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning sm:p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-bold sm:text-base">Vérification automatique non validée</p>
          <p className="text-xs font-medium leading-5 text-foreground/90 sm:text-sm">{aiError}</p>
          <p className="text-xs text-muted-foreground">
            Corrigez vos informations ou téléversez une photo plus nette et bien éclairée.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpenModal}
        className="shrink-0 text-xs"
      >
        Détails
      </Button>
    </div>
  );
}

function useKycSubmitFlow(
  wizard: ReturnType<typeof useKycWizard>,
  router: ReturnType<typeof useRouter>,
) {
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalState, setModalState] = useState<KycModalState>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [report, setReport] = useState<AiDecisionReport | null>(null);

  async function handleSubmit() {
    setAiError(null);
    setReport(null);
    setSubmitting(true);
    const ok = await wizard.submit();
    setSubmitting(false);
    if (!ok) return;

    setModalOpen(true);
    setModalState("verifying");
    try {
      const data = await executeAutoVerify();
      const isCompleted = data.status === "COMPLETED";
      setReport(data.report ?? null);
      if (isCompleted) {
        setModalState("success");
      } else {
        setAiError(resolveVerifyError(data));
        setModalState("rejected");
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur de connexion lors de la vérification automatique.";
      setAiError(msg);
      setModalState("rejected");
    }
  }

  function handleModifyDocuments() {
    setModalOpen(false);
    wizard.goToStep(4);
  }

  function handleGoToDashboard() {
    router.push("/client/dashboard");
  }

  return {
    submitting,
    verifyingAi: modalState === "verifying",
    modalOpen,
    modalState,
    aiError,
    report,
    setModalOpen,
    setAiError,
    handleSubmit,
    handleModifyDocuments,
    handleGoToDashboard,
  };
}

export default function KycPage() {
  const router = useRouter();
  const wizard = useKycWizard();
  const [certified, setCertified] = useState(false);
  const {
    submitting,
    verifyingAi,
    modalOpen,
    modalState,
    aiError,
    report,
    setModalOpen,
    setAiError,
    handleSubmit,
    handleModifyDocuments,
    handleGoToDashboard,
  } = useKycSubmitFlow(wizard, router);

  const isConfirm = wizard.current.kind === "confirm";

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Vérification d’identité"
        title="Compléter mon profil"
        description="Vos informations sont enregistrées et vérifiées instantanément par notre système automatisé."
      />
      <Card className="w-full border-border bg-card p-5 shadow-none sm:p-7 md:p-8 lg:p-9">
        <KycStepper steps={KYC_STEPS.map((s) => s.title)} current={wizard.step} />

        <KycRejectedBanner aiError={aiError} onOpenModal={() => setModalOpen(true)} />

        <FormError message={wizard.error} />

        <div className="mt-4 flex flex-col gap-4 sm:mt-6">
          <KycStepBody
            step={wizard.current}
            form={wizard.form}
            docs={wizard.docs}
            previews={wizard.previews}
            uploading={wizard.uploading}
            isPassport={wizard.idType === "PASSPORT"}
            certified={certified}
            onUpload={wizard.upload}
            onRemove={wizard.remove}
            onCertifiedChange={setCertified}
          />
        </div>

        <KycNavigationButtons
          step={wizard.step}
          isConfirm={isConfirm}
          certified={certified}
          submitting={submitting}
          verifyingAi={verifyingAi}
          onBack={() => {
            setAiError(null);
            wizard.back();
          }}
          onNext={() => {
            setAiError(null);
            wizard.next();
          }}
          onSubmit={handleSubmit}
        />
      </Card>

      <KycVerificationModal
        open={modalOpen}
        state={modalState}
        reason={aiError}
        report={report}
        onClose={() => setModalOpen(false)}
        onModifyDocuments={handleModifyDocuments}
        onRetry={handleSubmit}
        onGoToDashboard={handleGoToDashboard}
      />
    </div>
  );
}
