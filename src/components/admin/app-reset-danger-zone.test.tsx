import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppResetDangerZone } from "@/components/admin/app-reset-danger-zone";

describe("AppResetDangerZone UI component", () => {
  it("affiche la section de danger, les avertissements et le formulaire de réinitialisation", () => {
    const html = renderToStaticMarkup(<AppResetDangerZone currentBrand="Azari Microfinance" />);

    // Titres et avertissements
    expect(html).toContain("Zone de danger : Réinitialisation &amp; Changement de marque");
    expect(html).toContain("Données effacées :");
    expect(html).toContain("Tous les comptes et profils clients");
    expect(html).toContain("Crédits, contrats, échéanciers et portefeuilles");
    expect(html).toContain("Pièces justificatives KYC et stockage Supabase");
    expect(html).toContain("Éléments conservés :");
    expect(html).toContain("Votre compte administrateur actuel (connexion maintenue)");
    expect(html).toContain("Vos paramètres de produits de crédit");

    // Champs de formulaire
    expect(html).toContain("Nouveau nom officiel de la marque *");
    expect(html).toContain("Mot-clé de confirmation de sécurité *");
    expect(html).toContain("REINITIALISER");

    // Bouton de réinitialisation désactivé par défaut (disabled)
    expect(html).toContain("Réinitialiser et déployer la nouvelle marque");
    expect(html).toContain("disabled");
  });
});
