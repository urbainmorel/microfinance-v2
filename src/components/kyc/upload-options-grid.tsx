"use client";

import { Camera, FileUp } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  busy: boolean;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
};

export function UploadOptionsGrid({ busy, onOpenCamera, onOpenGallery }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onOpenCamera}
        disabled={busy}
        className={cn(
          "group flex items-center gap-3.5 rounded-2xl border border-dashed border-input bg-card p-4 text-left shadow-sm transition-all",
          "hover:border-accent hover:bg-accent/5 focus-visible:border-ring focus-visible:outline-none disabled:opacity-60",
        )}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-background">
          <Camera className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Prendre une photo</span>
          <span className="block text-xs text-muted-foreground">Caméra ou webcam directe</span>
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenGallery}
        disabled={busy}
        className={cn(
          "group flex items-center gap-3.5 rounded-2xl border border-dashed border-input bg-card p-4 text-left shadow-sm transition-all",
          "hover:border-accent hover:bg-accent/5 focus-visible:border-ring focus-visible:outline-none disabled:opacity-60",
        )}
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-background">
          <FileUp className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            Choisir dans la galerie
          </span>
          <span className="block text-xs text-muted-foreground">Galerie ou fichiers locaux</span>
        </div>
      </button>
    </div>
  );
}
