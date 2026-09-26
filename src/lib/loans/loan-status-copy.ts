export const DEFAULT_LOAN_COPY = {
  title: "Aucun prêt en cours",
  body: "Choisissez une offre adaptée à votre projet et envoyez votre demande.",
};

export const LOAN_STATE_COPY: Record<number, { title: string; body: string }> = {
  1: DEFAULT_LOAN_COPY,
  2: { title: "Demande en cours d’analyse", body: "Votre dossier est en cours d’étude." },
  3: {
    title: "Informations complémentaires",
    body: "Un agent attend des éléments supplémentaires.",
  },
  4: { title: "Prêt accepté", body: "Constituez la garantie pour poursuivre le décaissement." },
  5: { title: "Garantie incomplète", body: "Un dépôt de garantie complémentaire est nécessaire." },
  6: { title: "Garantie constituée", body: "Votre prêt est prêt pour le décaissement." },
  7: { title: "Prêt décaissé", body: "Les fonds sont disponibles selon le mode choisi." },
  8: { title: "Prêt en remboursement", body: "Consultez votre solde restant et vos échéances." },
  9: { title: "Prêt terminé", body: "Vos fonds bloqués ont été automatiquement libérés." },
  10: { title: "Demande rejetée", body: "Vous pouvez déposer une nouvelle demande." },
};

export function getLoanCardCopy(
  displayState: number,
  remainingGuarantee: number,
  contractSigned?: boolean,
): { title: string; body: string } {
  if (displayState === 4 && !contractSigned) {
    return {
      title: "Prêt approuvé · Signature requise",
      body: "Votre demande est validée. Veuillez consulter et signer votre contrat officiel pour recevoir vos fonds.",
    };
  }
  if (displayState === 7 && remainingGuarantee > 0) {
    return {
      title: "Prêt approuvé • Garantie requise",
      body: "Vos fonds sont crédités. Déposez votre garantie pour débloquer vos retraits.",
    };
  }
  return LOAN_STATE_COPY[displayState] ?? DEFAULT_LOAN_COPY;
}
