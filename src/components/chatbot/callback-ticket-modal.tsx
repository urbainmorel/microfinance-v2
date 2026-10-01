"use client";

import { CheckCircle2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Modal } from "@/components/ui/modal";

export interface SubmitData {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  loanAmountRequested?: number;
  loanPurpose?: string;
  metadata?: Record<string, unknown>;
}

export interface CallbackTicketModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (data: SubmitData) => Promise<void>;
  defaultName?: string;
}

function SuccessView() {
  return (
    <div className="my-6 flex flex-col items-center text-center">
      <div className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
        <CheckCircle2 className="size-6" />
      </div>
      <h3 className="mt-3 font-display text-lg font-bold text-foreground">Demande enregistrée !</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Un conseiller vous contactera par téléphone ou WhatsApp dans les plus brefs délais.
      </p>
    </div>
  );
}

interface InputsProps {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  purpose: string;
  setPurpose: (v: string) => void;
}

function FormInputs(p: InputsProps) {
  return (
    <>
      <input
        type="text"
        required
        value={p.name}
        onChange={(e) => p.setName(e.target.value)}
        placeholder="Nom complet *"
        aria-label="Nom complet"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground sm:text-xs"
      />
      <input
        type="tel"
        required
        value={p.phone}
        onChange={(e) => p.setPhone(e.target.value)}
        placeholder="Numéro de téléphone / WhatsApp *"
        aria-label="Numéro de téléphone ou WhatsApp"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground sm:text-xs"
      />
      <input
        type="email"
        value={p.email}
        onChange={(e) => p.setEmail(e.target.value)}
        placeholder="Email (optionnel)"
        aria-label="Adresse email optionnelle"
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground sm:text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={p.amount}
          onChange={(e) => p.setAmount(e.target.value)}
          placeholder="Montant souhaité"
          aria-label="Montant souhaité"
          className="rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground sm:text-xs"
        />
        <input
          type="text"
          value={p.purpose}
          onChange={(e) => p.setPurpose(e.target.value)}
          placeholder="Objet de la demande"
          aria-label="Objet de la demande"
          className="rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground sm:text-xs"
        />
      </div>
    </>
  );
}

function FormActions({ onClose, busy }: { onClose: () => void; busy: boolean }) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="w-1/2 rounded-xl border border-border bg-muted/60 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={busy}
        className="w-1/2 rounded-xl bg-accent py-2.5 text-xs font-bold text-accent-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "Envoi…" : "Valider"}
      </button>
    </div>
  );
}

function TicketForm({
  defaultName,
  onClose,
  onSubmit,
}: {
  defaultName: string;
  onClose: () => void;
  onSubmit: (d: SubmitData) => Promise<void>;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErr("Le nom et le numéro sont requis.");
      return;
    }
    try {
      setBusy(true);
      setErr(null);
      await onSubmit({
        clientName: name.trim(),
        clientPhone: phone.trim(),
        clientEmail: email.trim() || undefined,
        loanAmountRequested: amount ? Number(amount) : undefined,
        loanPurpose: purpose.trim() || undefined,
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {err ? (
        <div role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-600">
          {err}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <FormInputs
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          amount={amount}
          setAmount={setAmount}
          purpose={purpose}
          setPurpose={setPurpose}
        />
        <FormActions onClose={onClose} busy={busy} />
      </form>
    </div>
  );
}

export function CallbackTicketModal({
  open,
  isOpen,
  onClose,
  onSubmit,
  defaultName = "",
}: CallbackTicketModalProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const resolvedOpen = isOpen ?? open ?? false;

  const handleFormSubmit = async (data: SubmitData) => {
    await onSubmit(data);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  const handleClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <Modal
      open={resolvedOpen}
      isOpen={resolvedOpen}
      onClose={handleClose}
      title="Être rappelé par un conseiller"
      description="Laissez vos coordonnées pour une prise en charge directe."
      className="max-w-md"
    >
      {isSuccess ? (
        <SuccessView />
      ) : (
        <TicketForm defaultName={defaultName} onClose={handleClose} onSubmit={handleFormSubmit} />
      )}
    </Modal>
  );
}
