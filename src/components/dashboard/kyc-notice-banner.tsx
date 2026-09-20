"use client";

import { AlertTriangle, ArrowRight, Clock, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useProfile } from "@/lib/hooks/use-profile";
import { cn } from "@/lib/utils";

type BannerContent = {
  title: string;
  description: string;
  ctaLabel: string;
  isAlert: boolean;
};

function getBannerContent(status: string): BannerContent {
  if (status === "INFO_REQUESTED") {
    return {
      title: "Complément d’information requis",
      description:
        "Des pièces ou informations complémentaires sont nécessaires pour finaliser la validation de votre dossier.",
      ctaLabel: "Compléter mon dossier",
      isAlert: true,
    };
  }
  if (status === "REJECTED") {
    return {
      title: "Vérification d’identité non validée",
      description:
        "Votre dossier n’a pas pu être validé. Vous pouvez soumettre à nouveau vos justificatifs pour débloquer vos opérations.",
      ctaLabel: "Recommencer la vérification",
      isAlert: true,
    };
  }
  return {
    title: "Vérification d’identité requise",
    description:
      "Pour effectuer des dépôts, retraits, remboursements ou demander un prêt, vous devez vérifier votre identité.",
    ctaLabel: "Vérifier mon identité",
    isAlert: false,
  };
}

function PendingKycBanner() {
  return (
    <aside
      aria-label="Statut de vérification d'identité"
      className="relative overflow-hidden rounded-2xl border border-[#e5a034]/30 bg-[linear-gradient(135deg,rgba(255,248,237,0.95)_0%,rgba(254,242,221,0.75)_100%)] p-4 text-[#723b0a] shadow-sm dark:border-[#e5a034]/25 dark:bg-[linear-gradient(135deg,rgba(40,28,12,0.95)_0%,rgba(55,38,15,0.75)_100%)] dark:text-[#f8d49a] sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e5a034]/15 text-[#9a5b13] dark:text-[#f0ba65]">
            <Clock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground sm:text-[15px]">
              Dossier en cours d’examen
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-[13px]">
              Vos pièces ont bien été transmises. Nos équipes vérifient actuellement votre dossier.
              Vos opérations seront débloquées dès sa validation.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function KycNoticeBanner() {
  const { data: profile } = useProfile();

  if (!profile || profile.kyc_status === "COMPLETED") {
    return null;
  }

  const status = profile.kyc_status;
  if (status === "PENDING" || status === "IN_REVIEW") {
    return <PendingKycBanner />;
  }

  const content = getBannerContent(status);
  const Icon = content.isAlert ? AlertTriangle : ShieldAlert;

  return (
    <aside
      aria-label="Alerte vérification d'identité"
      className="relative overflow-hidden rounded-2xl border border-warning/35 bg-pastel-gold/45 p-4 text-warning shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground sm:text-[15px]">{content.title}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-[13px]">
              {content.description}
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:self-center">
          <Link
            href="/client/kyc"
            className={cn(
              buttonVariants({ variant: "accent", size: "sm" }),
              "w-full font-semibold shadow-sm sm:w-auto",
            )}
          >
            {content.ctaLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </aside>
  );
}
