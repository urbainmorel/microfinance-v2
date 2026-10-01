/**
 * Rate Limiter léger en mémoire (Sliding Window / Token Bucket)
 * Zéro dépendance externe. Nettoyage automatique des clés expirées.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Nettoyage périodique toutes les 5 minutes pour éviter toute fuite mémoire
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of store.entries()) {
        if (record.resetAt <= now) {
          store.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  ).unref?.();
}

export function checkRateLimit(params: { key: string; limit: number; windowMs: number }): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const { key, limit, windowMs } = params;
  const now = Date.now();
  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp?.trim()) return cfIp.trim();

  const nfIp = req.headers.get("x-nf-client-connection-ip");
  if (nfIp?.trim()) return nfIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const lastIp = parts[parts.length - 1];
      if (lastIp) return lastIp;
    }
  }

  return "127.0.0.1";
}
