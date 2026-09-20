import { describe, expect, it } from "vitest";

import { parseAiDecision } from "@/lib/kyc-ai";

describe("parseAiDecision", () => {
  it("accepte un rapport conforme et valide le dossier", () => {
    const json = JSON.stringify({
      decision: "VALIDATE",
      reason: null,
      confidence_score: 95,
      extracted_data: {
        name: "Kouassi Jean",
        birth_date: "1990-05-20",
        id_number: "CI0012345",
        expiry_date: "2029-10-15",
      },
      checks: {
        name_match: true,
        id_number_extracted: true,
        birth_date_extracted: true,
        not_expired: true,
        face_match: true,
        document_authentic: true,
      },
      summary: "Dossier parfaitement conforme.",
    });

    const res = parseAiDecision(json);
    expect(res.decision).toBe("VALIDATE");
    expect(res.reason).toBeNull();
    expect(res.report.confidence_score).toBe(95);
  });

  it("rejette avec motif explicite si une anomalie est détectée", () => {
    const json = JSON.stringify({
      decision: "REJECT",
      reason: "Le selfie ne correspond pas à la photo figurant sur la pièce d'identité.",
      confidence_score: 42,
      checks: {
        name_match: true,
        id_number_match: true,
        not_expired: true,
        face_match: false,
        document_authentic: true,
      },
    });

    const res = parseAiDecision(json);
    expect(res.decision).toBe("REJECT");
    expect(res.reason).toContain("Le selfie ne correspond pas");
  });

  it("gère les réponses corrompues ou invalides sans lever d'exception", () => {
    const res = parseAiDecision("invalid json {{{");
    expect(res.decision).toBe("REJECT");
    expect(res.reason).toContain("Veuillez reprendre des photos bien nettes");
  });

  it("gère les réponses vides", () => {
    const res = parseAiDecision(null);
    expect(res.decision).toBe("REJECT");
  });

  it("gère et extrait correctement les réponses encadrées de balises markdown ```json", () => {
    const markdownPayload = `Voici le résultat de l'analyse :
\`\`\`json
{
  "decision": "VALIDATE",
  "reason": null,
  "confidence_score": 92,
  "extracted_data": {
    "name": "Kouassi Jean",
    "birth_date": "1990-05-20",
    "id_number": "CI0012345"
  },
  "checks": {
    "face_match": true,
    "not_expired": true
  }
}
\`\`\`
Fin de transmission.`;

    const res = parseAiDecision(markdownPayload);
    expect(res.decision).toBe("VALIDATE");
    expect(res.reason).toBeNull();
    expect(res.report.confidence_score).toBe(92);
    expect(res.report.extracted_data?.id_number).toBe("CI0012345");
  });
});
