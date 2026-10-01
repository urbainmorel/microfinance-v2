import { describe, expect, it } from "vitest";

import { checkRateLimit, getClientIp } from "./rate-limiter";

describe("rate-limiter", () => {
  describe("checkRateLimit", () => {
    it("autorise les requêtes dans la limite et bloque au-delà", () => {
      const key = `test_${Date.now()}_${Math.random()}`;
      const res1 = checkRateLimit({ key, limit: 2, windowMs: 10000 });
      expect(res1.allowed).toBe(true);

      const res2 = checkRateLimit({ key, limit: 2, windowMs: 10000 });
      expect(res2.allowed).toBe(true);

      const res3 = checkRateLimit({ key, limit: 2, windowMs: 10000 });
      expect(res3.allowed).toBe(false);
      expect(res3.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe("getClientIp", () => {
    it("priorise cf-connecting-ip de Cloudflare", () => {
      const req = new Request("https://example.com", {
        headers: {
          "cf-connecting-ip": "203.0.113.195",
          "x-real-ip": "198.51.100.1",
          "x-forwarded-for": "192.0.2.1, 198.51.100.2",
        },
      });
      expect(getClientIp(req)).toBe("203.0.113.195");
    });

    it("utilise x-nf-client-connection-ip de Netlify si Cloudflare absent", () => {
      const req = new Request("https://example.com", {
        headers: {
          "x-nf-client-connection-ip": "203.0.113.50",
          "x-real-ip": "198.51.100.1",
        },
      });
      expect(getClientIp(req)).toBe("203.0.113.50");
    });

    it("utilise x-real-ip si headers CDN absents", () => {
      const req = new Request("https://example.com", {
        headers: {
          "x-real-ip": "198.51.100.99",
        },
      });
      expect(getClientIp(req)).toBe("198.51.100.99");
    });

    it("prend le DERNIER IP de x-forwarded-for pour éviter le spoofing d'en-tête", () => {
      const req = new Request("https://example.com", {
        headers: {
          "x-forwarded-for": "1.1.1.1 (spoofed), 203.0.113.10 (trusted cdn proxy)",
        },
      });
      expect(getClientIp(req)).toBe("203.0.113.10 (trusted cdn proxy)");
    });

    it("retombe sur 127.0.0.1 si aucun en-tête n'est présent", () => {
      const req = new Request("https://example.com");
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });
});
