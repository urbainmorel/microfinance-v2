import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyStandardWebhook } from "./standard-webhook";

const secret = `v1,whsec_${Buffer.from("azari-auth-hook-secret-32-bytes").toString("base64")}`;

function signedHeaders(payload: string, timestamp = Math.floor(Date.now() / 1000)) {
  const id = "msg_test_123";
  const key = Buffer.from(secret.replace("v1,whsec_", ""), "base64");
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");

  return {
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1,${signature}`,
    },
  };
}

describe("verifyStandardWebhook", () => {
  it("accepte une signature Standard Webhooks valide", () => {
    const payload = JSON.stringify({ hello: "world" });
    const { headers } = signedHeaders(payload);

    expect(verifyStandardWebhook(payload, headers, secret)).toEqual({ hello: "world" });
  });

  it("refuse une signature incorrecte", () => {
    const payload = JSON.stringify({ hello: "world" });
    const { headers } = signedHeaders(payload);

    expect(() =>
      verifyStandardWebhook(payload, { ...headers, "webhook-signature": "v1,invalid" }, secret),
    ).toThrow(/Signature/);
  });

  it("refuse un webhook expiré", () => {
    const payload = JSON.stringify({ hello: "world" });
    const { headers } = signedHeaders(payload, Math.floor(Date.now() / 1000) - 600);

    expect(() => verifyStandardWebhook(payload, headers, secret)).toThrow(/expiré/);
  });
});
