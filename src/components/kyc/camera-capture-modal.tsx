"use client";

import { Camera, Check, FlipHorizontal, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { type KycDocType } from "@/lib/schemas/kyc";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: KycDocType;
  onCapture: (file: File) => void;
};

function stopTracks(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

function captureVideoFrame(video: HTMLVideoElement, onCapture: (blob: Blob) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(
    (blob) => {
      if (blob) onCapture(blob);
    },
    "image/jpeg",
    0.92,
  );
}

function CameraOverlay({ docType }: { docType: KycDocType }) {
  const isSelfie = docType === "SELFIE";
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
      <div
        className={
          isSelfie
            ? "h-4/5 w-4/5 max-w-sm rounded-[32px] border-2 border-dashed border-accent/80 bg-accent/5 shadow-lg"
            : "aspect-[1.586] w-5/6 max-w-md rounded-2xl border-2 border-dashed border-accent/80 bg-accent/5 shadow-lg"
        }
      />
      <span className="mt-3 rounded-full bg-foreground/70 px-3 py-1 text-center text-xs font-medium text-background backdrop-blur-sm">
        {isSelfie
          ? "Tenez votre pièce proche de votre visage"
          : "Cadrez votre document dans le rectangle"}
      </span>
    </div>
  );
}

function CameraViewfinder({
  docType,
  facingMode,
  onFlip,
  onCaptureBlob,
  onError,
}: {
  docType: KycDocType;
  facingMode: "user" | "environment";
  onFlip: () => void;
  onCaptureBlob: (blob: Blob) => void;
  onError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isSelfie = docType === "SELFIE";

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((stream) => {
        if (!active) {
          stopTracks(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (active) onError("Accès caméra refusé ou non disponible sur cet appareil.");
      });

    return () => {
      active = false;
      stopTracks(streamRef.current);
      streamRef.current = null;
    };
  }, [facingMode, onError]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner">
        <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
        <CameraOverlay docType={docType} />
        {!isSelfie ? (
          <button
            type="button"
            onClick={onFlip}
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl bg-foreground/60 text-background backdrop-blur-sm transition-colors hover:bg-foreground/80"
            aria-label="Changer de caméra"
          >
            <FlipHorizontal className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => {
          if (videoRef.current) captureVideoFrame(videoRef.current, onCaptureBlob);
        }}
        className="group relative flex size-16 items-center justify-center rounded-full border-4 border-background bg-accent shadow-xl transition-transform hover:scale-105 active:scale-95"
        aria-label="Prendre la photo"
      >
        <div className="size-12 rounded-full border-2 border-background/60 bg-accent transition-colors group-hover:bg-accent/90" />
      </button>
    </div>
  );
}

function CapturedReview({
  url,
  onRetake,
  onConfirm,
}: {
  url: string;
  onRetake: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Photo capturée" className="size-full object-cover" />
      </div>
      <div className="flex w-full items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={onRetake} className="gap-2">
          <RefreshCw className="size-4" aria-hidden />
          Reprendre
        </Button>
        <Button type="button" variant="accent" onClick={onConfirm} className="gap-2">
          <Check className="size-4" aria-hidden />
          Valider cette photo
        </Button>
      </div>
    </div>
  );
}

export function CameraCaptureModal({ open, onOpenChange, docType, onCapture }: Props) {
  const isSelfie = docType === "SELFIE";
  const [facingMode, setFacingMode] = useState<"user" | "environment">(() =>
    isSelfie ? "user" : "environment",
  );
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleBlob(blob: Blob) {
    const f = new File([blob], `${docType.toLowerCase()}-capture.jpg`, { type: "image/jpeg" });
    setFile(f);
    setPreview(URL.createObjectURL(blob));
  }

  function handleRetake() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  }

  function handleConfirm() {
    if (file) {
      onCapture(file);
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
      onOpenChange(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleRetake();
        onOpenChange(next);
      }}
      title={
        isSelfie
          ? "Prendre votre selfie avec votre pièce proche de votre visage"
          : "Prendre la photo de votre pièce"
      }
      description={
        isSelfie
          ? "Tenez votre pièce d’identité bien visible à côté de votre visage sous un bon éclairage."
          : "Positionnez votre pièce dans le cadre sous un bon éclairage."
      }
    >
      {error ? (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <Camera className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-warning">{error}</p>
          <p className="text-xs text-muted-foreground">
            Veuillez autoriser l’accès à la caméra dans votre navigateur ou choisir une photo depuis
            la galerie.
          </p>
        </div>
      ) : preview ? (
        <CapturedReview url={preview} onRetake={handleRetake} onConfirm={handleConfirm} />
      ) : (
        <CameraViewfinder
          docType={docType}
          facingMode={isSelfie ? "user" : facingMode}
          onFlip={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          onCaptureBlob={handleBlob}
          onError={setError}
        />
      )}
    </Modal>
  );
}
