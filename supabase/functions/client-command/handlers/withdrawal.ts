import { CommandError } from "../errors.ts";
import {
  assertExactKeys,
  enumValue,
  isObject,
  optionalString,
  positiveAmount,
  requiredString,
} from "../validation.ts";
import type { JsonObject, ValidatedCommand } from "../types.ts";

export function handleWithdrawal(
  payload: JsonObject,
  userId: string,
  idempotencyKey: string,
  correlationId: string,
): ValidatedCommand {
  assertExactKeys(payload, ["type", "amount", "recipient"]);
  const type = enumValue(payload.type, ["MOBILE_MONEY", "BANK_TRANSFER"] as const);
  if (!isObject(payload.recipient)) {
    throw new CommandError("VALIDATION_ERROR", 400, "Destinataire invalide");
  }

  let recipient: JsonObject;
  if (type === "MOBILE_MONEY") {
    assertExactKeys(payload.recipient, ["operator", "phone", "name"]);
    const phone = requiredString(payload.recipient.phone, 24);
    if (!/^\+?[0-9][0-9 -]{6,22}$/.test(phone)) {
      throw new CommandError("VALIDATION_ERROR", 400, "Telephone invalide");
    }
    recipient = {
      operator: requiredString(payload.recipient.operator, 50),
      phone,
      name: requiredString(payload.recipient.name, 120),
    };
  } else {
    assertExactKeys(payload.recipient, [
      "bank",
      "bankCode",
      "account",
      "country",
      "iban",
      "motif",
      "name",
    ]);
    const country = enumValue(payload.recipient.country, [
      "BJ",
      "BF",
      "CI",
      "GW",
      "ML",
      "NE",
      "SN",
      "TG",
    ] as const);
    recipient = {
      bank: requiredString(payload.recipient.bank, 120),
      bankCode: requiredString(payload.recipient.bankCode, 32),
      account: requiredString(payload.recipient.account, 64),
      country,
      iban: optionalString(payload.recipient.iban, 64),
      motif: requiredString(payload.recipient.motif, 200),
      name: requiredString(payload.recipient.name, 120),
    };
  }

  return {
    rpc: "create_client_withdrawal",
    args: {
      p_client: userId,
      p_correlation_id: correlationId,
      p_idempotency_key: idempotencyKey,
      p_type: type,
      p_amount: positiveAmount(payload.amount),
      p_recipient: recipient,
    },
    fallbackStatus: "PENDING",
  };
}
