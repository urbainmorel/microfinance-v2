"use client";

import { ArrowRight, Clock, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: string | undefined;
};

export function KycRequiredModal({ open, onOpenChange, status }: Props) {
  const isPending = status === "PENDING" || status === "IN_REVIEW";
  const isInfoRequested = status === "INFO_REQUESTED";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Vérification d’identité requise"
      description="Pour la sécurité de vos transactions, l'accès aux opérations financières requiert un dossier d'identité validé."
      className="max-w-lg"
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span
          className={cn(
            "grid size-16 place-items-center rounded-2xl",
            isPending
              ? "bg-[#e5a034]/15 text-[#9a5b13] dark:text-[#f0ba65]"
              : "bg-pastel-gold text-warning",
          )}
        >
          {isPending ? (
            <Clock className="size-8" aria-hidden />
          ) : (
            <ShieldAlert className="size-8" aria-hidden />
          )}
        </span>

        <h3 className="mt-4 font-display text-lg font-bold text-foreground sm:text-xl">
          {isPending
            ? "Dossier en cours d’examen"
            : isInfoRequested
              ? "Informations complémentaires requises"
              : "Activer les opérations de votre compte"}
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isPending
            ? "Votre dossier KYC a été transmis avec succès et est actuellement en cours de vérification par notre équipe. Les dépôts, retraits et demandes de prêt seront débloqués dès la validation."
            : isInfoRequested
              ? "Notre équipe a demandé des pièces ou précisions complémentaires pour valider votre dossier. Veuillez compléter votre profil pour débloquer les opérations."
              : "Toutes les opérations financières (dépôts, retraits, remboursements et demandes de prêt) sont temporairement verrouillées tant que vos pièces d'identité ne sont pas soumises et validées."}
        </p>

        <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Fermer
          </Button>

          {!isPending ? (
            <Link
              href="/client/kyc"
              onClick={() => onOpenChange(false)}
              className={cn(
                buttonVariants({ variant: "accent" }),
                "w-full font-semibold sm:w-auto",
              )}
            >
              {isInfoRequested ? "Compléter mon dossier" : "Vérifier mon identité"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
