import { describe, expect, it } from "vitest";

import {
  mentionsMissingInformation,
  MISSING_INFORMATION_REPLY,
  sanitizeMissingInformationReply,
} from "./rag-service";

describe("mentionsMissingInformation", () => {
  it("détecte la phrase de transfert demandée", () => {
    expect(
      mentionsMissingInformation(
        "Je n'ai pas cette information pour le moment. Je transmets votre préoccupation à l'équipe compétente, qui reviendra vers vous rapidement.",
      ),
    ).toBe(true);
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
