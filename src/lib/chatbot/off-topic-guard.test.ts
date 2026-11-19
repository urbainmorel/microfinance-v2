import { describe, expect, it } from "vitest";

import { getOffTopicReply, isClearlyOffTopic } from "./off-topic-guard";

describe("isClearlyOffTopic", () => {
  it("reconnaît les questions manifestement hors sujet", () => {
    expect(isClearlyOffTopic("Quel temps fait-il à Abidjan ?")).toBe(true);
    expect(isClearlyOffTopic("Qui a gagné le match de football ?")).toBe(true);
    expect(isClearlyOffTopic("Donne-moi une recette de poulet yassa")).toBe(true);
    expect(isClearlyOffTopic("Écris-moi un poème sur la mer")).toBe(true);
    expect(isClearlyOffTopic("Quelle est la capitale de la France ?")).toBe(true);
    expect(isClearlyOffTopic("Combien font 2 + 2 ?")).toBe(true);
    expect(isClearlyOffTopic("Quel est le prix du Bitcoin ?")).toBe(true);
    expect(isClearlyOffTopic("Quelle heure est-il ?")).toBe(true);
  });

  it("laisse passer les questions liées à Azari et aux prêts", () => {
    expect(isClearlyOffTopic("Quel est le taux du Prêt Croissance ?")).toBe(false);
    expect(isClearlyOffTopic("À quelle heure ouvrez-vous ?")).toBe(false);
    expect(isClearlyOffTopic("À quelle heure puis-je retirer ?")).toBe(false);
    expect(isClearlyOffTopic("Quel est le prix d'un prêt ?")).toBe(false);
    expect(isClearlyOffTopic("Combien coûte le dépôt de garantie ?")).toBe(false);
    expect(isClearlyOffTopic("Puis-je financer une voiture ?")).toBe(false);
    expect(isClearlyOffTopic("Quel est le numéro de téléphone du support ?")).toBe(false);
  });

  it("laisse passer les salutations et les questions sur l'assistant", () => {
    expect(isClearlyOffTopic("Bonjour")).toBe(false);
    expect(isClearlyOffTopic("Qui es-tu ?")).toBe(false);
    expect(isClearlyOffTopic("Merci beaucoup")).toBe(false);
  });
});

describe("getOffTopicReply", () => {
  it("retourne la réponse courte pour une question hors sujet", () => {
    const reply = getOffTopicReply("Quel temps fait-il ?");

    expect(reply).toContain("Je ne peux pas répondre à cette question");
    expect(reply).toContain("Azari Microfinance");
    expect(reply).toContain("offres de prêt");
  });

  it("ne retourne rien pour une question métier", () => {
    expect(getOffTopicReply("Quel est le montant maximum d'un prêt ?")).toBeNull();
  });
});
