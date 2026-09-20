"use client";

import { Camera, CheckCircle2, FileText, IdCard, Loader2, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";

import { type KycDocType } from "@/lib/schemas/kyc";

type Props = {
  docType: KycDocType;
  previewUrl?: string;
  uploaded: boolean;
  busy: boolean;
  optional?: boolean;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  onRemove?: () => void;
};

interface DocVisualMeta {
  titleDefault: string;
  titleUploaded: string;
  descDefault: string;
  descUploaded: string;
  illustrationSrc: string;
  illustrationAlt: string;
  statusRecorded: string;
  icon: typeof IdCard | typeof Camera;
}

const DOC_CONFIG: Record<KycDocType, DocVisualMeta> = {
  ID_FRONT: {
    titleDefault: "Exemple du recto de la pièce d’identité",
    titleUploaded: "Votre pièce d’identité (Recto)",
    descDefault:
      "Prenez en photo le recto de votre pièce ou importez le fichier. Veillez à ce que le document soit bien cadré, net et lisible.",
    descUploaded:
      "Le recto de votre pièce a bien été enregistré. Vous pouvez le reprendre, le changer ou le supprimer ci-dessous.",
    illustrationSrc: "/images/recto ci.png",
    illustrationAlt: "Exemple du recto d’une pièce d’identité",
    statusRecorded: "Pièce enregistrée",
    icon: IdCard,
  },
  ID_BACK: {
    titleDefault: "Exemple du verso de la pièce d’identité",
    titleUploaded: "Votre pièce d’identité (Verso)",
    descDefault:
      "Prenez en photo le verso de votre pièce ou importez le fichier. Veillez à ce que le document soit bien cadré, net et lisible.",
    descUploaded:
      "Le verso de votre pièce a bien été enregistré. Vous pouvez le reprendre, le changer ou le supprimer ci-dessous.",
    illustrationSrc: "/images/verso ci.png",
    illustrationAlt: "Exemple du verso d’une pièce d’identité",
    statusRecorded: "Pièce enregistrée",
    icon: IdCard,
  },
  SELFIE: {
    titleDefault: "Exemple de photo de vérification",
    titleUploaded: "Votre photo de vérification",
    descDefault:
      "Prenez votre photo en tenant votre pièce d’identité proche de votre visage. Veillez à ce que votre visage et les informations de la pièce soient nets et lisibles.",
    descUploaded:
      "Votre photo a bien été enregistrée. Vous pouvez la reprendre, la changer ou la supprimer ci-dessous.",
    illustrationSrc: "/images/kyc-selfie.webp",
    illustrationAlt: "Exemple d’un selfie avec pièce d’identité",
    statusRecorded: "Photo enregistrée",
    icon: Camera,
  },
};

function DocumentOverlayControls({
  busy,
  statusRecorded,
  onOpenCamera,
  onOpenGallery,
  onRemove,
}: {
  busy: boolean;
  statusRecorded: string;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-3.5 text-white sm:p-4">
      <div className="flex items-center gap-2">
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
            <span className="text-xs font-semibold text-white">Enregistrement…</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4 text-accent" aria-hidden />
            <span className="text-xs font-semibold text-white">{statusRecorded}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCamera}
          className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/30"
        >
          <Camera className="size-3.5 text-accent" aria-hidden />
          Reprendre
        </button>
        <button
          type="button"
          onClick={onOpenGallery}
          className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/30"
        >
          <RefreshCw className="size-3.5 text-muted-foreground" aria-hidden />
          Changer
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="flex size-8 items-center justify-center rounded-xl bg-white/20 text-white/90 backdrop-blur-md transition-colors hover:bg-destructive hover:text-white"
            aria-label="Supprimer"
            title="Supprimer"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DocumentPreviewMedia({
  hasDoc,
  previewUrl,
  illustrationSrc,
  illustrationAlt,
  title,
}: {
  hasDoc: boolean;
  previewUrl?: string;
  illustrationSrc: string;
  illustrationAlt: string;
  title: string;
}) {
  if (hasDoc && previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={previewUrl} alt={title} className="size-full object-contain p-2" />
    );
  }

  if (hasDoc && !previewUrl) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center">
        <FileText className="size-12 text-accent" aria-hidden />
        <p className="text-sm font-semibold text-foreground">Document enregistré</p>
        <p className="text-xs text-muted-foreground">Fichier prêt pour validation</p>
      </div>
    );
  }

  return (
    <Image
      src={illustrationSrc}
      alt={illustrationAlt}
      fill
      className="object-contain p-2"
      sizes="(max-width: 640px) 100vw, 768px"
      priority
    />
  );
}

export function DocumentVisualCard({
  docType,
  previewUrl,
  uploaded,
  busy,
  optional,
  onOpenCamera,
  onOpenGallery,
  onRemove,
}: Props) {
  const meta = DOC_CONFIG[docType];
  const hasDoc = uploaded || Boolean(previewUrl);
  const Icon = meta.icon;

  const title = hasDoc
    ? meta.titleUploaded
    : optional
      ? `${meta.titleDefault} (facultatif)`
      : meta.titleDefault;

  const description = hasDoc
    ? meta.descUploaded
    : optional
      ? "Non requis si vous utilisez un passeport. Vous pouvez passer à l’étape suivante ou l’ajouter si nécessaire."
      : meta.descDefault;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-accent" aria-hidden />
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
      </div>
      <p className="mb-4 text-xs leading-5 text-muted-foreground">{description}</p>
      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border bg-card sm:h-72">
        <DocumentPreviewMedia
          hasDoc={hasDoc}
          previewUrl={previewUrl}
          illustrationSrc={meta.illustrationSrc}
          illustrationAlt={meta.illustrationAlt}
          title={title}
        />

        {hasDoc && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-xl bg-black/60 text-white/90 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-destructive hover:text-white"
            aria-label="Supprimer la pièce"
            title="Supprimer la pièce"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}

        {hasDoc ? (
          <DocumentOverlayControls
            busy={busy}
            statusRecorded={meta.statusRecorded}
            onOpenCamera={onOpenCamera}
            onOpenGallery={onOpenGallery}
            onRemove={onRemove}
          />
        ) : null}
      </div>
    </div>
  );
}
