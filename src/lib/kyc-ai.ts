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
    document_authentic?: boolean;
  };
  summary?: string;
}

export { getKycAiSystemPrompt } from "@/lib/kyc/prompts/kyc-system-prompt";

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

function checkDocumentChecks(checks: AiDecisionReport["checks"]): string | null {
  if (checks?.document_authentic === false) {
    return "La pièce d'identité ne paraît pas authentique ou lisible.";
  }
  if (checks?.not_expired === false) {
    return "La pièce d'identité est expirée.";
  }
  if (checks?.name_match === false) {
    return "Le nom déclaré ne concorde pas avec celui présent sur la pièce.";
  }
  if (checks?.id_number_extracted === false) {
    return "Le numéro officiel de la pièce d'identité est illisible ou introuvable.";
  }
  return null;
}

function checkDocumentData(parsed: AiDecisionReport): string | null {
  const idNumber = parsed.extracted_data?.id_number?.trim();
  if (!idNumber) {
    return "Le numéro officiel de la pièce d'identité est illisible ou introuvable.";
  }
  const score = parsed.confidence_score;
  if (typeof score === "number" && score < 50) {
    return "Le score de confiance d'analyse est insuffisant pour valider automatiquement la pièce.";
  }
  return null;
}

function checkSecurityInvariants(parsed: AiDecisionReport): string | null {
  return checkDocumentChecks(parsed.checks) ?? checkDocumentData(parsed);
}

function sanitizeAiDecision(parsed: AiDecisionReport): {
  decision: "VALIDATE" | "REJECT";
  reason: string | null;
} {
  if (parsed.decision !== "VALIDATE") {
    return {
      decision: "REJECT",
      reason: parsed.reason || "Vérification de conformité non concluante.",
    };
  }

  const invariantError = checkSecurityInvariants(parsed);
  if (invariantError) {
    return { decision: "REJECT", reason: invariantError };
  }

  return { decision: "VALIDATE", reason: null };
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
    const { decision, reason } = sanitizeAiDecision(parsed);
    return { decision, reason, report: { ...parsed, decision, reason } };
  } catch {
    const fallback: AiDecisionReport = {
      decision: "REJECT",
      reason:
        "La vérification automatique n'a pas pu analyser vos pièces avec certitude. Veuillez reprendre des photos bien nettes.",
    };
    return { decision: "REJECT", reason: fallback.reason, report: fallback };
  }
}
