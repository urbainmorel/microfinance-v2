import { expect, type Page, test } from "@playwright/test";

type Credentials = {
  email: string | undefined;
  password: string | undefined;
};

const clientCredentials: Credentials = {
  email: process.env.E2E_CLIENT_EMAIL,
  password: process.env.E2E_CLIENT_PASSWORD,
};

const staffCredentials: Credentials = {
  email: process.env.E2E_STAFF_EMAIL,
  password: process.env.E2E_STAFF_PASSWORD,
};

function hasCredentials(
  credentials: Credentials,
): credentials is { email: string; password: string } {
  return Boolean(credentials.email && credentials.password);
}

async function login(page: Page, credentials: { email: string; password: string }) {
  await page.goto("/auth/login");
  await page.getByLabel("Adresse email").fill(credentials.email);
  await page.getByLabel("Mot de passe").fill(credentials.password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "Se connecter" }).click(),
  ]);
}

async function expectRoute(page: Page, path: string, heading: string) {
  const response = await page.goto(path);

  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
}

test.describe("navigation client authentifiée", () => {
  test.skip(
    !hasCredentials(clientCredentials),
    "E2E_CLIENT_EMAIL et E2E_CLIENT_PASSWORD sont requis.",
  );

  test("parcourt les opérations critiques sans aucune soumission financière", async ({ page }) => {
    await login(page, clientCredentials as { email: string; password: string });

    await expectRoute(page, "/client/deposit/request", "Faire un dépôt");
    await expectRoute(page, "/client/withdraw/momo", "Retrait Mobile Money");
    await expectRoute(page, "/client/withdraw/bank", "Virement bancaire");
    await expectRoute(page, "/client/loans/request", "Demander un prêt");
    await expectRoute(page, "/client/operations", "Mes opérations");
  });
});

test.describe("navigation staff authentifiée", () => {
  test.skip(
    !hasCredentials(staffCredentials),
    "E2E_STAFF_EMAIL et E2E_STAFF_PASSWORD sont requis.",
  );

  test("parcourt les files du back-office en lecture seule", async ({ page }) => {
    await login(page, staffCredentials as { email: string; password: string });

    await expectRoute(page, "/admin/kyc", "File KYC");
    await expectRoute(page, "/admin/deposits", "File des dépôts");
    await expectRoute(page, "/admin/withdrawals", "File des retraits");
    await expectRoute(page, "/admin/repayments", "File des remboursements");
    await expectRoute(page, "/admin/loans", "Demandes de prêt");
    await expectRoute(page, "/admin/audit", "Journal d’audit");
  });
});
