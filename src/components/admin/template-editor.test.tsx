import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TemplateEditor } from "@/components/admin/template-editor";

import type { NotificationTemplate } from "@/lib/admin/api-templates";

describe("TemplateEditor component", () => {
  const sampleTemplate: NotificationTemplate = {
    id: "tmpl_1",
    slug: "loan_requests_disbursed",
    language: "fr",
    subject: "Votre prêt a été décaissé",
    bodyHtml: "<p>Votre prêt de {{amount}} FCFA est disponible.</p>",
    variables: ["amount"],
    updatedAt: "2026-10-12T00:00:00Z",
  };

  it("affiche les détails du modèle, les variables déclarées et l'aperçu complet", () => {
    const html = renderToStaticMarkup(
      <TemplateEditor template={sampleTemplate} busy={false} onSave={vi.fn()} onCancel={vi.fn()} />,
    );

    // Titres et champs
    expect(html).toContain("loan_requests_disbursed");
    expect(html).toContain("FR");
    expect(html).toContain("Votre prêt a été décaissé");
    expect(html).toContain("+{{amount}}");

    // Modes d'aperçu
    expect(html).toContain("Email complet");
    expect(html).toContain("Corps seul");

    // L'iframe d'aperçu par défaut contient le gabarit avec l'en-tête de marque
    expect(html).toContain("Azari Microfinance");
    expect(html).toContain("Notification Officielle");
  });

  it("affiche l'avertissement de sécurité et le pied de page UMOA dans le rendu", () => {
    const html = renderToStaticMarkup(
      <TemplateEditor template={sampleTemplate} busy={false} onSave={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(html).toContain("Conseil sécurité");
    expect(html).toContain("support@azari-microfinance.site");
  });
});
