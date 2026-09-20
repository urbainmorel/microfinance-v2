import { Printer, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

type ContractActionsProps = {
  isSigned: boolean;
  formattedSignedDate: string | null;
  accepted: boolean;
  setAccepted: (val: boolean) => void;
  pin: string;
  setPin: (val: string) => void;
  isPending: boolean;
  error?: Error | null;
  onClearError?: () => void;
  onSign: () => void;
};

function SignedBanner({ formattedSignedDate }: { formattedSignedDate: string | null }) {
  const router = useRouter();
  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-accent" />
          <div>
            <p className="font-semibold text-foreground">Contrat déjà signé</p>
            <p className="text-xs text-muted-foreground">
              Signé électroniquement le {formattedSignedDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="size-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </Button>
          <Button variant="accent" size="sm" onClick={() => router.push("/client/loans")}>
            Retour à mes prêts
          </Button>
        </div>
      </div>
    </div>
  );
}

function checkIsPinError(error?: Error | null): boolean {
  if (!error) return false;
  const code = (error as { code?: string }).code;
  if (code === "PIN_INVALID" || code === "PIN_LOCKED") return true;
  return error.message.toLowerCase().includes("pin");
}

function PinSection({
  pin,
  setPin,
  error,
  isPinError,
  onClearError,
}: {
  pin: string;
  setPin: (v: string) => void;
  error?: Error | null;
  isPinError: boolean;
  onClearError?: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/30 p-4">
      <FormField
        id="contract-pin"
        label="Code PIN de signature (4 à 6 chiffres)"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={6}
        placeholder="••••"
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          if (error) onClearError?.();
        }}
        error={isPinError ? (error?.message ?? "") : undefined}
      />
      <p className="text-xs text-muted-foreground">
        Votre code PIN confirme votre consentement et scelle juridiquement votre signature.
      </p>
    </div>
  );
}

function SignForm({
  accepted,
  setAccepted,
  pin,
  setPin,
  isPending,
  error,
  onClearError,
  onSign,
}: Omit<ContractActionsProps, "isSigned" | "formattedSignedDate">) {
  const router = useRouter();
  const isPinError = checkIsPinError(error);

  return (
    <div className="mt-6 space-y-4">
      {error && !isPinError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error.message}
        </div>
      ) : null}

      <label className="flex cursor-pointer select-none items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-border accent-[hsl(var(--accent))]"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span className="text-sm font-medium leading-tight text-foreground">
          J’accepte également l’intégralité des clauses et conditions relatives au présent contrat
          de prêt.
        </span>
      </label>

      {accepted ? (
        <PinSection
          pin={pin}
          setPin={setPin}
          error={error}
          isPinError={isPinError}
          onClearError={onClearError}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          variant="accent"
          disabled={!accepted || !/^\d{4,6}$/.test(pin) || isPending}
          onClick={onSign}
        >
          {isPending ? "Signature en cours…" : "J’accepte"}
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={isPending}
          onClick={() => router.push("/client/loans")}
        >
          Je n’accepte pas
        </Button>
      </div>
    </div>
  );
}

export function LoanContractActions(props: ContractActionsProps) {
  if (props.isSigned) {
    return <SignedBanner formattedSignedDate={props.formattedSignedDate} />;
  }
  return <SignForm {...props} />;
}
