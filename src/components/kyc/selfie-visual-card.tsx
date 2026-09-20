"use client";

import { DocumentVisualCard } from "@/components/kyc/document-visual-card";

type Props = {
  previewUrl?: string;
  uploaded: boolean;
  busy: boolean;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  onRemove?: () => void;
};

export function SelfieVisualCard(props: Props) {
  return <DocumentVisualCard docType="SELFIE" {...props} />;
}
