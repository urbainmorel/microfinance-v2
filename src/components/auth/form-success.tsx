import { CheckCircle2 } from "lucide-react";

export function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-200"
    >
      <CheckCircle2
        className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        strokeWidth={1.8}
        aria-hidden
      />
      <span>{message}</span>
    </div>
  );
}
