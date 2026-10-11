"use client";

import { Clock } from "lucide-react";

interface HoursCardProps {
  start: string;
  end: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
}

export function HoursCard({ start, end, onStartChange, onEndChange }: HoursCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <Clock className="size-4 text-accent" />
        <h3 className="font-display text-sm font-bold text-foreground">
          Plages Horaires d’Ouverture de l’Agence
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Heure d’ouverture
          </label>
          <input
            type="time"
            step="1"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">
            Heure de fermeture
          </label>
          <input
            type="time"
            step="1"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
