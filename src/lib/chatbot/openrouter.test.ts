import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmbedding, executeChatCompletion } from "./openrouter";

describe("openrouter embeddings", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key-123";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retourne un vecteur vide si le texte d'entrée est vide", async () => {
    const vector = await createEmbedding("   ");
    expect(vector).toEqual([]);
  });

  it("génère des embeddings correctement via fetch", async () => {
    const mockVector = [0.12, 0.34, -0.56];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: mockVector }] }),
    } as Response);

    const result = await createEmbedding("Question test");
    expect(result).toEqual(mockVector);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("openrouter completions", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key-123";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exécute une complétion standard et retourne le contenu", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Bonjour, comment puis-je vous aider ?" } }],
      }),
    } as Response);

    const res = await executeChatCompletion({
      messages: [{ role: "user", content: "Bonjour" }],
      model: "qwen/qwen-2.5-72b-instruct",
    });

    expect(res.content).toBe("Bonjour, comment puis-je vous aider ?");
    expect(res.toolCall).toBeNull();
  });

  it("parse correctement un appel d'outil escalate_to_human", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "",
              tool_calls: [
                {
                  function: {
                    name: "escalate_to_human",
                    arguments: JSON.stringify({
                      reason: "Demande de crédit",
                      summary: "Client souhaite 5 000 000 FCFA",
                      urgency: "high",
                      loanAmountRequested: 5000000,
                    }),
                  },
                },
              ],
            },
          },
        ],
      }),
    } as Response);

    const res = await executeChatCompletion({
      messages: [{ role: "user", content: "Je veux un prêt de 5M" }],
      model: "qwen/qwen-2.5-72b-instruct",
    });

    expect(res.toolCall?.name).toBe("escalate_to_human");
    expect(res.toolCall?.args.loanAmountRequested).toBe(5000000);
  });

  it("bascule sur le modèle fallback en cas d'échec du modèle principal", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => "Rate limit" } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Réponse fallback" } }],
        }),
      } as Response);

    global.fetch = fetchMock;

    const res = await executeChatCompletion({
      messages: [{ role: "user", content: "Bonjour" }],
      model: "qwen/qwen-2.5-72b-instruct",
      fallbackModel: "google/gemini-2.5-flash",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.content).toBe("Réponse fallback");
  });
});
