/**
 * Protection CSRF (Cross-Site Request Forgery) pour les routes API sensibles.
 * Vérifie l'origine des requêtes entrantes selon les headers Sec-Fetch-Site, Origin, Referer et Host.
 */

function extractHost(urlStr: string): string | null {
  try {
    return new URL(urlStr).host;
  } catch {
    return null;
  }
}

function isSameHost(urlStr: string | null, expectedHost: string | null): boolean {
  if (!urlStr || !expectedHost) return false;
  const h = extractHost(urlStr)?.toLowerCase();
  return Boolean(h && h === expectedHost);
}

/**
 * Vérifie si la requête provient de la même origine (same-origin).
 * Rejette explicitement les requêtes cross-site non sollicitées.
 */
export function verifySameOrigin(req: Request): boolean {
  // 1. Rejette les requêtes cross-site identifiées par Sec-Fetch-Site
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return false;
  }

  const rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const host = rawHost ? (rawHost.split(",")[0]?.trim().toLowerCase() ?? null) : null;

  // 2. Vérification du header Origin
  const origin = req.headers.get("origin");
  if (origin) {
    return isSameHost(origin, host);
  }

  // 3. Fallback sur le header Referer si Origin absent
  const referer = req.headers.get("referer");
  if (referer) {
    return isSameHost(referer, host);
  }

  // 4. Si aucun header d'origine n'est fourni (appels serveur internes autorisés)
  return true;
}
