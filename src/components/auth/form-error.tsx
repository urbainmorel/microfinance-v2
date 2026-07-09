import { AlertTriangle } from "lucide-react";

/** Bandeau d'erreur — doré + icône (jamais de rouge, DESIGN §4.2, §15). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[14px] border border-warning/30 bg-pastel-gold px-3.5 py-3 text-sm text-warning"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
