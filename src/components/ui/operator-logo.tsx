import * as React from "react";

import { cn } from "@/lib/utils";

export type MobileOperator = "WAVE" | "MTN" | "ORANGE" | "MOOV";

export type OperatorInfo = {
  id: MobileOperator;
  name: string;
  shortLabel: string;
  avifSrc: string;
  webpSrc: string;
  pngSrc: string;
  alt: string;
  title: string;
  badgeColor: string;
};

export const MOBILE_OPERATORS: OperatorInfo[] = [
  {
    id: "WAVE",
    name: "Wave",
    shortLabel: "Wave",
    avifSrc: "/images/operators/logo-wave.avif",
    webpSrc: "/images/operators/logo-wave.webp",
    pngSrc: "/images/operators/logo-wave.png",
    alt: "Logo officiel Wave Mobile Money",
    title: "Wave Mobile Money",
    badgeColor: "bg-[#1DC3EC]/15 border-[#1DC3EC]/40 text-[#0084A8] dark:text-[#1DC3EC]",
  },
  {
    id: "MTN",
    name: "MTN MoMo",
    shortLabel: "MTN",
    avifSrc: "/images/operators/logo-mtn.avif",
    webpSrc: "/images/operators/logo-mtn.webp",
    pngSrc: "/images/operators/logo-mtn.png",
    alt: "Logo officiel MTN Mobile Money (MoMo)",
    title: "MTN MoMo",
    badgeColor: "bg-[#FFCC00]/20 border-[#FFCC00]/50 text-[#8F6B00] dark:text-[#FFCC00]",
  },
  {
    id: "ORANGE",
    name: "Orange Money",
    shortLabel: "Orange",
    avifSrc: "/images/operators/logo-orange.avif",
    webpSrc: "/images/operators/logo-orange.webp",
    pngSrc: "/images/operators/logo-orange.png",
    alt: "Logo officiel Orange Money",
    title: "Orange Money",
    badgeColor: "bg-[#FF7900]/15 border-[#FF7900]/40 text-[#C45500] dark:text-[#FF7900]",
  },
  {
    id: "MOOV",
    name: "Moov Money",
    shortLabel: "Moov",
    avifSrc: "/images/operators/logo-moov.avif",
    webpSrc: "/images/operators/logo-moov.webp",
    pngSrc: "/images/operators/logo-moov.png",
    alt: "Logo officiel Moov Money",
    title: "Moov Money",
    badgeColor: "bg-[#0066B3]/15 border-[#0066B3]/40 text-[#0066B3] dark:text-[#3B96E0]",
  },
];

export function getOperatorInfo(operator?: string | null): OperatorInfo | null {
  if (!operator) return null;
  const norm = operator.trim().toUpperCase();
  return MOBILE_OPERATORS.find((op) => op.id === norm) ?? null;
}

export function OperatorLogo({
  operator,
  size = 64,
  className,
  priority = false,
}: {
  operator?: string | null;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const info = getOperatorInfo(operator);
  if (!info) return null;

  return (
    <picture className="inline-block shrink-0">
      <source srcSet={info.avifSrc} type="image/avif" />
      <source srcSet={info.webpSrc} type="image/webp" />
      <img
        src={info.pngSrc}
        alt={info.alt}
        title={info.title}
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("aspect-square rounded-xl object-cover", className)}
      />
    </picture>
  );
}
