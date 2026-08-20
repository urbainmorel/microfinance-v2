import { expect, test } from "@playwright/test";

test.describe("parcours publics", () => {
  test("affiche l'inscription sans soumettre le formulaire", async ({ page }) => {
    const response = await page.goto("/auth/register");

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
    await expect(page.getByLabel("Prénom")).toBeVisible();
    await expect(page.getByLabel("Nom", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Adresse email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeVisible();
    await expect(page.getByRole("link", { name: "politique de confidentialité" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  test("affiche la connexion sans utiliser de secret", async ({ page }) => {
    const response = await page.goto("/auth/login");

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    await expect(page.getByLabel("Adresse email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("expose un manifeste PWA installable et une page hors ligne", async ({ page, request }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBeTruthy();
    expect(manifestResponse.headers()["content-type"]).toContain("application/manifest+json");

    const manifest = await manifestResponse.json();
    expect(manifest).toMatchObject({ display: "standalone", lang: "fr", start_url: "/" });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([expect.objectContaining({ sizes: "192x192" })]),
    );

    const response = await page.goto("/offline");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Connexion indisponible" })).toBeVisible();
  });

  test("affiche la politique de confidentialité", async ({ page }) => {
    const response = await page.goto("/privacy");

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Politique de confidentialité" })).toBeVisible();
    await expect(page.getByText("Version privacy-v1")).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour à l’inscription" })).toHaveAttribute(
      "href",
      "/auth/register",
    );
  });
});
