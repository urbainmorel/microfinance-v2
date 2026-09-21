import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { KycVerificationModal } from "@/components/kyc/kyc-verification-modal";

import type { AiDecisionReport } from "@/lib/kyc-ai";

describe("KycVerificationModal", () => {
  const defaultProps = {
    open: true,
    state: "verifying" as const,
    reason: null,
    onClose: vi.fn(),
    onGoToDashboard: vi.fn(),
  };

  it("renders null when open is false or state is idle", () => {
    const closed = renderToStaticMarkup(<KycVerificationModal {...defaultProps} open={false} />);
    expect(closed).toBe("");

    const idle = renderToStaticMarkup(<KycVerificationModal {...defaultProps} state="idle" />);
    expect(idle).toBe("");
  });

  it("renders verifying state with animated status and checklist", () => {
    const html = renderToStaticMarkup(<KycVerificationModal {...defaultProps} state="verifying" />);

    expect(html).toContain("Vérification automatique");
    expect(html).toContain("Analyse IA en cours");
    expect(html).toContain("Authenticité et lisibilité de la pièce");
    expect(html).toContain("Conformité de l’identité");
  });

  it("renders success state with celebratory elements and dashboard button", () => {
    const mockReport: AiDecisionReport = {
      decision: "VALIDATE",
      reason: null,
      extracted_data: {
        name: "Jean Dupont",
        id_number: "CI123456789",
      },
    };

    const html = renderToStaticMarkup(
      <KycVerificationModal {...defaultProps} state="success" report={mockReport} />,
    );

    expect(html).toContain("Identité validée avec succès !");
    expect(html).toContain("100% Conforme • Validé");
    expect(html).toContain("Jean Dupont");
    expect(html).toContain("CI123456789");
    expect(html).toContain("Accéder à mon tableau de bord");
  });

  it("renders rejected state with reason, diagnostic checks, and modify button", () => {
    const mockReport: AiDecisionReport = {
      decision: "REJECT",
      reason: "Le document fourni est flou ou illisible.",
      checks: {
        document_authentic: false,
        name_match: true,
        not_expired: true,
      },
    };

    const html = renderToStaticMarkup(
      <KycVerificationModal
        {...defaultProps}
        state="rejected"
        reason={mockReport.reason}
        report={mockReport}
        onModifyDocuments={vi.fn()}
      />,
    );

    expect(html).toContain("Vérification non validée");
    expect(html).toContain("Le document fourni est flou ou illisible.");
    expect(html).toContain("Diagnostic détaillé :");
    expect(html).toContain("Modifier mes justificatifs");
  });
});
