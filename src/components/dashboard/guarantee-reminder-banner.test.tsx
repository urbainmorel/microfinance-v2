import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  GuaranteeActionRequiredBanner,
  GuaranteePendingVerificationBanner,
} from "./guarantee-reminder-banner";

describe("GuaranteeReminderBanner UI components", () => {
  it("affiche la notification invitant au versement tant qu'aucun dépôt n'a été soumis", () => {
    const html = renderToStaticMarkup(<GuaranteeActionRequiredBanner remainingGuarantee={50000} />);

    expect(html).toContain("Action requise");
    expect(html).toContain("Dépôt de garantie obligatoire pour débloquer vos retraits");
    expect(html).toContain("Faire mon « dépôt de garantie »");
    expect(html).toContain("/client/deposit/request?motif=GUARANTEE&amp;amount=50000");
    expect(html).not.toContain("Vérification en cours");
    expect(html).not.toContain("Dépôt de garantie en cours de vérification");
  });

  it("remplace la notification de rappel par la notification de vérification dès que le dépôt est soumis", () => {
    const html = renderToStaticMarkup(<GuaranteePendingVerificationBanner amount={50000} />);

    // La notification de rappel / demande de faire le dépôt DOIT être retirée
    expect(html).not.toContain("Action requise");
    expect(html).not.toContain("Dépôt de garantie obligatoire pour débloquer vos retraits");
    expect(html).not.toContain("Faire mon « dépôt de garantie »");
    expect(html).not.toContain("/client/deposit/request");

    // Elle DOIT mentionner que le dépôt est en cours de vérification
    expect(html).toContain("Vérification en cours");
    expect(html).toContain("Dépôt de garantie en cours de vérification");
    expect(html).toContain("en cours de vérification par nos services");
    expect(html).toContain("Suivre mes opérations");
    expect(html).toContain("/client/operations");
  });
});
