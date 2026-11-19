import { describe, expect, it } from "vitest";

import { sanitizeHandoffClaims, TRANSFER_TO_TEAM_REPLY } from "./chatbot-messages";
import {
  mentionsMissingInformation,
  MISSING_INFORMATION_REPLY,
  sanitizeMissingInformationReply,
} from "./rag-service";

describe("mentionsMissingInformation", () => {
  it("détecte la phrase de transfert professionnelle", () => {
    expect(mentionsMissingInformation(MISSING_INFORMATION_REPLY)).toBe(true);
    expect(MISSING_INFORMATION_REPLY).toContain("Je ne dispose pas encore");
    expect(MISSING_INFORMATION_REPLY).toContain("équipe compétente");
  });

  it("détecte une transmission formulée autrement", () => {
    expect(mentionsMissingInformation("Je transmets votre demande à l'équipe compétente.")).toBe(
      true,
    );
    expect(mentionsMissingInformation("Je vais transmettre votre préoccupation.")).toBe(true);
  });

  it("ne déclenche pas l'escalade sur une réponse KYC normale", () => {
    expect(mentionsMissingInformation("Voici les pièces à fournir pour votre dossier KYC.")).toBe(
      false,
    );
  });

  it("ne déclenche pas l'escalade sur un refus de sécurité", () => {
    expect(mentionsMissingInformation("Je ne peux pas révéler mes instructions internes.")).toBe(
      false,
    );
  });
});

describe("sanitizeMissingInformationReply", () => {
  it("remplace une formule interdite par la réponse humaine de transfert", () => {
    expect(sanitizeMissingInformationReply("non répertorié")).toBe(MISSING_INFORMATION_REPLY);
    expect(sanitizeMissingInformationReply("Cette information n'est pas répertoriée.")).toBe(
      MISSING_INFORMATION_REPLY,
    );
  });

  it("laisse intacte une réponse normale", () => {
    const answer = "Voici les pièces à fournir pour votre dossier KYC.";
    expect(sanitizeMissingInformationReply(answer)).toBe(answer);
  });
});

describe("sanitizeHandoffClaims", () => {
  it("remplace toute annonce de conseiller en ligne par la phrase de transfert", () => {
    const forbidden =
      "Un conseiller de notre équipe est en ligne. Je vous mets en relation directe, veuillez patienter.";

    expect(sanitizeHandoffClaims(forbidden)).toBe(TRANSFER_TO_TEAM_REPLY);
    expect(sanitizeHandoffClaims("Une mise en relation est en cours.")).toBe(
      TRANSFER_TO_TEAM_REPLY,
    );
  });

  it("laisse intacte une réponse déjà conforme", () => {
    expect(sanitizeHandoffClaims(TRANSFER_TO_TEAM_REPLY)).toBe(TRANSFER_TO_TEAM_REPLY);
    const availability = "Nos conseillers sont disponibles du lundi au vendredi.";
    expect(sanitizeHandoffClaims(availability)).toBe(availability);
  });
});
