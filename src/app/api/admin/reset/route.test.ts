import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/admin/reset/route";
import * as resetService from "@/lib/admin/app-reset-service";
import * as adminSupabaseModule from "@/lib/supabase/admin";
import * as serverSupabaseModule from "@/lib/supabase/server";

import type { DatabaseClient } from "@/lib/database.types";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/supabase/admin");
vi.mock("@/lib/admin/app-reset-service");

function mockClientWithUser(role: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: role ? { id: "admin-id-123" } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: role ? { role } : null }),
        }),
      }),
    }),
  } as unknown as DatabaseClient;
}

describe("POST /api/admin/reset - validations & auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejette les requêtes non authentifiées avec 401", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser(null),
    );

    const req = new Request("http://localhost:3000/api/admin/reset", {
      method: "POST",
      body: JSON.stringify({ newBrandName: "Brand X", confirmationKeyword: "REINITIALISER" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejette les requêtes non-admin avec 403", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser("client"),
    );

    const req = new Request("http://localhost:3000/api/admin/reset", {
      method: "POST",
      body: JSON.stringify({ newBrandName: "Brand X", confirmationKeyword: "REINITIALISER" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("rejette les requêtes CSRF cross-origin avec 403", async () => {
    const req = new Request("http://localhost:3000/api/admin/reset", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
      body: JSON.stringify({ newBrandName: "Brand X", confirmationKeyword: "REINITIALISER" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("CSRF");
  });

  it("rejette si le mot-clé de confirmation est incorrect avec 400", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser("admin"),
    );

    const req = new Request("http://localhost:3000/api/admin/reset", {
      method: "POST",
      body: JSON.stringify({ newBrandName: "Nouvelle Marque", confirmationKeyword: "OUI" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("REINITIALISER");
  });

  it("rejette si le nouveau nom de marque est trop court", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser("admin"),
    );

    const req = new Request("http://localhost:3000/api/admin/reset", {
      method: "POST",
      body: JSON.stringify({ newBrandName: "A", confirmationKeyword: "REINITIALISER" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/reset - execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exécute la réinitialisation et renvoie 200 en cas de succès", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser("admin"),
    );

    const adminMock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { platform_name: "Azari Microfinance" } }),
          }),
        }),
      }),
    };
    vi.spyOn(adminSupabaseModule, "createSupabaseAdminClient").mockReturnValue(
      adminMock as unknown as ReturnType<typeof adminSupabaseModule.createSupabaseAdminClient>,
    );

    vi.spyOn(resetService, "purgeSupportAndKnowledge").mockResolvedValue(undefined);
    vi.spyOn(resetService, "purgeTransactionalData").mockResolvedValue(undefined);
    vi.spyOn(resetService, "purgeClientAccounts").mockResolvedValue(42);
    vi.spyOn(resetService, "purgeAllStorageFiles").mockResolvedValue(10);
    vi.spyOn(resetService, "updateBrandSettings").mockResolvedValue(undefined);
    vi.spyOn(resetService, "recordResetAudit").mockResolvedValue(undefined);

    const req = new Request("http://localhost:3000/api/admin/reset", {
      method: "POST",
      body: JSON.stringify({
        newBrandName: "Kori Microfinance",
        depositPhone: "+2250700000000",
        depositOperator: "Orange Money",
        confirmationKeyword: "REINITIALISER",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      purgedClients: number;
      purgedFiles: number;
      newBrandName: string;
    };
    expect(body.success).toBe(true);
    expect(body.purgedClients).toBe(42);
    expect(body.purgedFiles).toBe(10);
    expect(body.newBrandName).toBe("Kori Microfinance");
  });
});
