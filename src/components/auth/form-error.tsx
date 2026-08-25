import { AlertTriangle } from "lucide-react";

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-warning/25 bg-pastel-gold px-4 py-3 text-sm font-medium text-warning"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
