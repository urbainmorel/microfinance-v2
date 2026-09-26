// Limitation de fréquence en mémoire pour prévenir les attaques DoS / épuisement de quota IA
const recentVerifications = new Map<string, number>();
const VERIFY_COOLDOWN_MS = 30_000; // 30 secondes de cooldown par utilisateur

export function checkAndRecordVerificationCooldown(userId: string): boolean {
  const now = Date.now();
  const lastTime = recentVerifications.get(userId);

  // Nettoyage régulier des anciennes entrées
  if (recentVerifications.size > 1000) {
    for (const [id, time] of recentVerifications.entries()) {
      if (now - time > VERIFY_COOLDOWN_MS) recentVerifications.delete(id);
    }
  }

  if (lastTime && now - lastTime < VERIFY_COOLDOWN_MS) {
    return false;
  }

  recentVerifications.set(userId, now);
  return true;
}
