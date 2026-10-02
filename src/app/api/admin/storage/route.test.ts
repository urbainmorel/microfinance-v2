import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/admin/storage/route";
import * as serverSupabaseModule from "@/lib/supabase/server";

import type { DatabaseClient } from "@/lib/database.types";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/supabase/admin");

function mockClientWithUser(role: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: role ? { id: "test-user-id" } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: role ? { role } : null }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({
      data: {
        totalBytes: 500000000,
        totalFiles: 50,
        quotaBytes: 1073741824,
        remainingBytes: 573741824,
        usedPercentage: 46.6,
        matchingFiles: 10,
        matchingBytes: 100000000,
        buckets: [],
      },
      error: null,
    }),
  } as unknown as DatabaseClient;
}

describe("GET /api/admin/storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne 401 si non connecté", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser(null),
    );
    const req = new Request("http://localhost:3000/api/admin/storage");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("retourne 403 si non admin", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser("client"),
    );
    const req = new Request("http://localhost:3000/api/admin/storage");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("retourne 400 si date de fin < date de début", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser("admin"),
    );
    const req = new Request(
      "http://localhost:3000/api/admin/storage?startDate=2026-10-10&endDate=2026-10-01",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("postérieure ou égale");
  });

  it("retourne les métriques si admin authentifié", async () => {
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(
      mockClientWithUser("admin"),
    );
    const req = new Request(
      "http://localhost:3000/api/admin/storage?startDate=2026-01-01&endDate=2026-06-30",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { totalBytes: number; matchingFiles: number };
    expect(body.totalBytes).toBe(500000000);
    expect(body.matchingFiles).toBe(10);
  });
});

describe("POST /api/admin/storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejette les requêtes cross-site avec 403 (protection CSRF)", async () => {
    const req = new Request("http://localhost:3000/api/admin/storage", {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({ startDate: "2026-01-01", endDate: "2026-03-31" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("CSRF");
  });

  it("exécute la purge et renvoie le rapport", async () => {
    const client = mockClientWithUser("admin");
    (client as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc = vi.fn().mockResolvedValue({
      data: {
        deletedCount: 15,
        freedBytes: 150000000,
        remainingBytes: 800000000,
        usedPercentage: 25.5,
      },
      error: null,
    });
    vi.spyOn(serverSupabaseModule, "createSupabaseServerClient").mockResolvedValue(client);

    const req = new Request("http://localhost:3000/api/admin/storage", {
      method: "POST",
      body: JSON.stringify({ startDate: "2026-01-01", endDate: "2026-03-31" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deletedCount: number; freedBytes: number };
    expect(body.deletedCount).toBe(15);
    expect(body.freedBytes).toBe(150000000);
  });
});
