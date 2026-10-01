import { describe, expect, it } from "vitest";

import { verifySameOrigin } from "./csrf";

describe("verifySameOrigin", () => {
  it("rejette immédiatement les requêtes avec Sec-Fetch-Site cross-site", () => {
    const req = new Request("https://example.com/api/chat", {
      headers: {
        "sec-fetch-site": "cross-site",
        host: "example.com",
        origin: "https://example.com",
      },
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it("accepte une requête avec Origin et Host identiques", () => {
    const req = new Request("https://azari.bj/api/chat", {
      headers: {
        host: "azari.bj",
        origin: "https://azari.bj",
      },
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it("rejette une requête avec Origin cross-site frauduleuse", () => {
    const req = new Request("https://azari.bj/api/chat", {
      headers: {
        host: "azari.bj",
        origin: "https://evil-attacker.com",
      },
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it("accepte une requête avec Referer correspondant quand Origin est absent", () => {
    const req = new Request("https://azari.bj/api/chat", {
      headers: {
        host: "azari.bj",
        referer: "https://azari.bj/support",
      },
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it("rejette une requête avec Referer frauduleux quand Origin est absent", () => {
    const req = new Request("https://azari.bj/api/chat", {
      headers: {
        host: "azari.bj",
        referer: "https://evil-attacker.com/exploit.html",
      },
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it("supporte x-forwarded-host derrière un reverse proxy / CDN", () => {
    const req = new Request("https://internal-cluster:3000/api/chat", {
      headers: {
        host: "internal-cluster:3000",
        "x-forwarded-host": "azari.bj, internal-proxy",
        origin: "https://azari.bj",
      },
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it("rejette si Origin est invalide (ex: 'null')", () => {
    const req = new Request("https://azari.bj/api/chat", {
      headers: {
        host: "azari.bj",
        origin: "null",
      },
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it("accepte une requête locale de développement avec port", () => {
    const req = new Request("http://localhost:3000/api/chat", {
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    });
    expect(verifySameOrigin(req)).toBe(true);
  });
});
