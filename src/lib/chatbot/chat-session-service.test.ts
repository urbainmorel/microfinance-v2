import { describe, expect, it, vi } from "vitest";

import * as adminSupabaseModule from "@/lib/supabase/admin";

import { getRecentHistory } from "./chat-session-service";

import type { DatabaseClient } from "@/lib/database.types";

vi.mock("@/lib/supabase/admin");

function buildClient(rows: Array<{ sender_type: string; content: string }>) {
  const limit = vi.fn().mockResolvedValue({ data: rows });
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return { client: { from } as unknown as DatabaseClient, order };
}

describe("getRecentHistory", () => {
  it("récupère les 8 messages les plus récents, puis les remet dans l'ordre chronologique", async () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      sender_type: index % 2 === 0 ? "user" : "bot",
      content: `message-${8 - index}`,
    }));
    const { client, order } = buildClient(rows);
    vi.mocked(adminSupabaseModule.createSupabaseAdminClient).mockReturnValue(
      client as unknown as ReturnType<typeof adminSupabaseModule.createSupabaseAdminClient>,
    );

    const history = await getRecentHistory(
      client as unknown as Parameters<typeof getRecentHistory>[0],
      "conv-id",
    );

    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(history.map((message) => message.content)).toEqual([
      "message-1",
      "message-2",
      "message-3",
      "message-4",
      "message-5",
      "message-6",
      "message-7",
      "message-8",
    ]);
  });

  it("convertit les messages du conseiller en rôle assistant", async () => {
    const { client } = buildClient([{ sender_type: "agent", content: "Bonjour" }]);
    vi.mocked(adminSupabaseModule.createSupabaseAdminClient).mockReturnValue(
      client as unknown as ReturnType<typeof adminSupabaseModule.createSupabaseAdminClient>,
    );

    const history = await getRecentHistory(
      client as unknown as Parameters<typeof getRecentHistory>[0],
      "conv-id",
    );

    expect(history).toEqual([{ role: "assistant", content: "Bonjour" }]);
  });
});
