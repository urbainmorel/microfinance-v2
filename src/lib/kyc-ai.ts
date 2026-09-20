export interface AiDecisionReport {
  decision: "VALIDATE" | "REJECT";
  reason: string | null;
  confidence_score?: number;
  extracted_data?: {
    name?: string | null;
    birth_date?: string | null;
    id_number?: string | null;
    expiry_date?: string | null;
  };
  checks?: {
    name_match?: boolean;
    id_number_extracted?: boolean;
    birth_date_extracted?: boolean;
    not_expired?: boolean;
    face_match?: boolean;
    document_authentic?: boolean;
  };
  summary?: string;
}

export function getKycAiSystemPrompt(today: string): string {
  return `Tu es un auditeur de conformité KYC et biométrique pour une institution de microfinance.
Ton rôle est d'analyser automatiquement les pièces d'identité et le selfie fournis pour décider immédiatement si le dossier doit être VALIDÉ ou REJETÉ sans aucune intervention humaine.

Règles de vérification et d'extraction strictes :
1. OCR & Extraction des données officielles :
   - Extrais impérativement de la pièce d'identité :
     * Le nom et les prénoms
     * La date de naissance au format YYYY-MM-DD (ex: 1992-07-24)
     * Le numéro de pièce d'identité officiel (ex: numéro de CNI, numéro de passeport)
     * La date d'expiration au format YYYY-MM-DD si elle est mentionnée sur le document
   - Vérifie si le nom et prénom déclarés correspondent à ceux figurant sur la pièce (tolère les inversions nom/prénom ou légères variantes d'accents).
   - Vérifie si la pièce d'identité est encore valide à la date d'aujourd'hui (${today}).
   - Si la date de naissance ou le numéro de pièce est illisible, tronqué ou absent du document, rejette le dossier avec un motif explicite.
2. Vérification Biométrique (Face Match) :
   - Compare attentivement le visage de la photo sur la pièce d'identité (ID_FRONT) avec le visage de la personne sur le selfie (SELFIE).
   - Évalue la ressemblance faciale (score de 0 à 100). Rejette si inférieur à 70%.
3. Authenticité du document :
   - Rejette si l'image est floue, illisible, s'il s'agit d'une photo d'un écran (moiré), d'un document tronqué ou manifestement altéré.

Critères de décision finale :
- "VALIDATE" : Le document est lisible et valide, le nom correspond, la date de naissance et le numéro de pièce ont été extraits avec certitude, et le selfie correspond à la photo de la pièce.
- "REJECT" : Si un critère échoue. Fournis obligatoirement dans ce cas un motif clair, concis et bienveillant en français dans le champ "reason".

Réponds STRICTEMENT sous format JSON avec le schéma suivant :
{
  "decision": "VALIDATE" | "REJECT",
  "reason": "motif précis en français si rejet, sinon null",
  "confidence_score": 0-100,
  "extracted_data": {
    "name": "nom lu ou null",
    "birth_date": "YYYY-MM-DD ou null",
    "id_number": "numéro de pièce lu ou null",
    "expiry_date": "YYYY-MM-DD ou null"
  },
  "checks": {
    "name_match": true | false,
    "id_number_extracted": true | false,
    "birth_date_extracted": true | false,
    "not_expired": true | false,
    "face_match": true | false,
    "document_authentic": true | false
  },
  "summary": "résumé synthétique de l'analyse"
}`;
}

function extractJsonSubstring(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export function parseAiDecision(raw: string | null | undefined): {
  decision: "VALIDATE" | "REJECT";
  reason: string | null;
  report: AiDecisionReport;
} {
  if (!raw) {
    const fallback: AiDecisionReport = {
      decision: "REJECT",
      reason: "Aucune réponse d'analyse fournie par le service.",
    };
    return { decision: "REJECT", reason: fallback.reason, report: fallback };
  }

  try {
    const jsonStr = extractJsonSubstring(raw);
    const parsed = JSON.parse(jsonStr) as AiDecisionReport;
    const decision = parsed.decision === "VALIDATE" ? "VALIDATE" : "REJECT";
    const reason =
      decision === "REJECT" ? parsed.reason || "Vérification de conformité non concluante." : null;

    return { decision, reason, report: parsed };
  } catch {
    const fallback: AiDecisionReport = {
      decision: "REJECT",
      reason:
        "La vérification automatique n'a pas pu analyser vos pièces avec certitude. Veuillez reprendre des photos bien nettes.",
    };
    return { decision: "REJECT", reason: fallback.reason, report: fallback };
  }
}
