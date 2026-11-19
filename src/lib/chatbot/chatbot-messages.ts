/**
 * Messages de transfert et d'information manquante — source unique.
 * Le chatbot ne doit jamais annoncer qu'un conseiller est en ligne ni
 * promettre une mise en relation directe.
 */
export const TRANSFER_TO_TEAM_REPLY =
  "Je transmets votre demande à l'équipe compétente, qui reviendra vers vous dans les meilleurs délais.";

export const MISSING_INFORMATION_REPLY =
  "Je ne dispose pas encore des informations nécessaires sur ce sujet. " +
  "Je transmets votre demande à l'équipe compétente, qui reviendra vers vous dans les meilleurs délais.";

export const OFF_TOPIC_REPLY =
  "Je ne peux pas répondre à cette question. Si vous avez d'autres questions sur Azari " +
  "Microfinance ou ses offres de prêt, vous pouvez me les poser.";

const FORBIDDEN_HANDOFF_CLAIM_PATTERN =
  /(conseiller[^.!?]{0,80}(?:en ligne|disponible (?:immédiatement|maintenant|tout de suite))|mise en relation|je vous mets en relation|vous mettre en relation)/i;

/**
 * Le chatbot ne doit jamais annoncer qu'un conseiller est en ligne ou promettre
 * une mise en relation directe. On remplace alors la réponse par la phrase de
 * transfert professionnelle.
 */
export function sanitizeHandoffClaims(content: string): string {
  return FORBIDDEN_HANDOFF_CLAIM_PATTERN.test(content) ? TRANSFER_TO_TEAM_REPLY : content;
}
