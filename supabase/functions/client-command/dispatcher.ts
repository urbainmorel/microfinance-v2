import { CommandError } from "./errors.ts";
import { handleCancel } from "./handlers/cancel.ts";
import { handleDeposit } from "./handlers/deposit.ts";
import { handleGuaranteeBlock } from "./handlers/guarantee-block.ts";
import { handleLoanContractSign } from "./handlers/loan-sign.ts";
import { handleLoanSubmit } from "./handlers/loan-submit.ts";
import { handleRepayment } from "./handlers/repayment.ts";
import { handleWithdrawal } from "./handlers/withdrawal.ts";
import { isObject } from "./validation.ts";
import type { Action, ValidatedCommand } from "./types.ts";

export function dispatchCommand(
  action: Action,
  payload: unknown,
  userId: string,
  idempotencyKey: string,
  correlationId: string,
): ValidatedCommand {
  if (!isObject(payload)) {
    throw new CommandError("VALIDATION_ERROR", 400, "Payload invalide");
  }

  switch (action) {
    case "deposit.create":
      return handleDeposit(payload, userId, idempotencyKey, correlationId);
    case "withdrawal.create":
      return handleWithdrawal(payload, userId, idempotencyKey, correlationId);
    case "request.cancel":
      return handleCancel(payload, userId, idempotencyKey, correlationId);
    case "loan.submit":
      return handleLoanSubmit(payload, userId, idempotencyKey, correlationId);
    case "loan.contract.sign":
      return handleLoanContractSign(payload, userId, idempotencyKey, correlationId);
    case "guarantee.block":
      return handleGuaranteeBlock(payload, userId, idempotencyKey, correlationId);
    case "repayment.create":
      return handleRepayment(payload, userId, idempotencyKey, correlationId);
  }
}
