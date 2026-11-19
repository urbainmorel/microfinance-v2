import { OFF_TOPIC_REPLY } from "./chatbot-messages";

const CORE_DOMAIN_PATTERN =
  /(?:^|[^\p{L}])(azari|microfinance|pr[êe]ts?|cr[ée]dits?|emprunts?|emprunter|financements?|financer|offres?|produits?|montants?|dur[ée]es?|conditions?|[ée]ligibilit[ée]|simulateurs?)(?![\p{L}])/iu;

const ACCOUNT_DOMAIN_PATTERN =
  /(?:^|[^\p{L}])(comptes?|wallet|portefeuille|[ée]pargne|[ée]pargner|d[ée]p[ôo]t|d[ée]poser|retrait|retirer|virement|transfert|rembours(?:er|ement)|[ée]ch[ée]ance|mensualit[ée]|int[ée]r[êe]t|taux|frais|garantie|solde|patrimoine|pr[ée]l[èe]vements?|payer|mobile money|mtn|moov|orange|wave|banque)(?![\p{L}])/iu;

const PROCESS_DOMAIN_PATTERN =
  /(?:^|[^\p{L}])(kyc|identit[ée]|document|pin|s[ée]curit[ée]|agence|horaire|ouverture|ouvert(?:e|s|es)?|ouvre|ouvrez|ferme|fermez|contact|support|conseiller|service|application|dossier|demande|signature|contrat|assurance|p[ée]nalit[ée]|retard|cl[ôo]ture|si[èe]ge|adresse|pays|zone|num[ée]ro|fcfa|xof|umoa|bceao)(?![\p{L}])/iu;

const SELF_REFERENCE_PATTERN =
  /(qui es-tu|qui [êe]tes-vous|tu es (?:qui|une ia|un robot|un assistant)|es-tu (?:une ia|un robot|un assistant)|ton nom|comment tu t'appelles|parle-moi de toi)/iu;

const OFF_TOPIC_TOPIC_PATTERN =
  /(?:^|[^\p{L}])(m[ée]t[ée]o|quel temps|temp[ée]rature|pluie|neige|football|foot|match|basket|tennis|psg|real madrid|politique|pr[ée]sident|élection|guerre|actualit[ée]|recette|cuisine|poulet|yassa|atti[ée]k[ée]|film|musique|chanson|s[ée]rie|acteur|netflix|capitale|population|habitants|histoire de france|science|maths|physique|m[ée]decin|sant[ée]|maladie|m[ée]dicament|voyage|billet|h[ôo]tel|avion|blague|po[èe]me|traduis|traduction|code source|python|javascript|bitcoin|heure|quel jour|moteur|religion|dieu)(?![\p{L}])/iu;

const OFF_TOPIC_TASK_PATTERN =
  /(?:^|[^\p{L}])(écris|ecris|raconte|traduis|calcule|g[ée]n[èe]re|dessine|compose)(?![\p{L}])[^.?!]{0,60}(?:po[èe]me|blague|histoire|texte|code|image|chanson|recette|lettre)/iu;

const MATH_PATTERN = /\d+\s*[+\-*/]\s*\d+/;

function hasDomainKeyword(message: string): boolean {
  return (
    CORE_DOMAIN_PATTERN.test(message) ||
    ACCOUNT_DOMAIN_PATTERN.test(message) ||
    PROCESS_DOMAIN_PATTERN.test(message)
  );
}

/**
 * Détecte les questions manifestement sans rapport avec Azari Microfinance.
 * Le filtre reste volontairement conservateur : dès qu'un mot-clé métier est
 * présent, la question part au modèle normal.
 */
export function isClearlyOffTopic(question: string): boolean {
  const clean = question.trim();
  if (!clean || hasDomainKeyword(clean)) return false;
  if (SELF_REFERENCE_PATTERN.test(clean)) return false;

  if (
    OFF_TOPIC_TOPIC_PATTERN.test(clean) ||
    OFF_TOPIC_TASK_PATTERN.test(clean) ||
    MATH_PATTERN.test(clean)
  ) {
    return true;
  }

  return false;
}

export function getOffTopicReply(question: string): string | null {
  return isClearlyOffTopic(question) ? OFF_TOPIC_REPLY : null;
}
