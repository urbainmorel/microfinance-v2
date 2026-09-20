"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFcfa } from "@/lib/format";

export function PinBlockingCard({
  pin,
  pinError,
  blocking,
  remainingGuarantee,
  onPinChange,
  onCancel,
  onConfirm,
}: {
  pin: string;
  pinError: string | null;
  blocking: boolean;
  remainingGuarantee: number;
  onPinChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <label htmlFor="modal-guarantee-pin" className="text-xs font-semibold text-foreground">
        Code PIN pour débiter {formatFcfa(remainingGuarantee)} de votre épargne libre
      </label>
      <div className="mt-2">
        <Input
          id="modal-guarantee-pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={6}
          value={pin}
          aria-invalid={Boolean(pinError)}
          onChange={(e) => onPinChange(e.target.value)}
          placeholder="••••"
          className="h-11 bg-background"
        />
      </div>
      {pinError ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warning">
          <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
          {pinError}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={blocking}>
          Retour
        </Button>
        <Button
          type="button"
          variant="accent"
          size="sm"
          className="flex-1"
          onClick={onConfirm}
          disabled={blocking}
        >
          {blocking ? "Validation…" : "Confirmer le blocage"}
        </Button>
      </div>
    </div>
  );
}
