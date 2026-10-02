export interface ResetAppPayload {
  newBrandName: string;
  depositPhone?: string;
  depositOperator?: string;
  depositInstruction?: string;
  confirmationKeyword: string;
}

export interface ResetAppResult {
  success: boolean;
  message: string;
  purgedClients: number;
  purgedFiles: number;
  newBrandName: string;
}

export async function executeAppReset(payload: ResetAppPayload): Promise<ResetAppResult> {
  const response = await fetch("/api/admin/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error || `Erreur de réinitialisation (${response.status})`);
  }

  return response.json() as Promise<ResetAppResult>;
}
