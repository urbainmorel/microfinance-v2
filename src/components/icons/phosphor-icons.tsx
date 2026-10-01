import type { SVGProps } from "react";

interface PhosphorIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Icône Phosphor "circles-three" (Bold)
 * Symbolise la réserve financière / les pièces / le dépôt de garantie.
 */
export function CirclesThreeIcon({ className, size = 24, ...props }: PhosphorIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M176,76a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,76Zm-48,24a24,24,0,1,1,24-24A24,24,0,0,1,128,100Zm60,24a48,48,0,1,0,48,48A48.05,48.05,0,0,0,188,124Zm0,72a24,24,0,1,1,24-24A24,24,0,0,1,188,196ZM68,124a48,48,0,1,0,48,48A48.05,48.05,0,0,0,68,124Zm0,72a24,24,0,1,1,24-24A24,24,0,0,1,68,196Z" />
    </svg>
  );
}

/**
 * Icône Phosphor "folder-lock" (Bold)
 * Symbolise la sécurité bancaire, les contrats verrouillés et le chiffrement.
 */
export function FolderLockIcon({ className, size = 24, ...props }: PhosphorIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M224,152h-4v-4a32,32,0,0,0-64,0v4h-4a12,12,0,0,0-12,12v44a12,12,0,0,0,12,12h72a12,12,0,0,0,12-12V164A12,12,0,0,0,224,152Zm-44-4a8,8,0,0,1,16,0v4H180Zm32,48H164V176h48Zm4-128H133.39l-26-29.29a20,20,0,0,0-15-6.71H40A20,20,0,0,0,20,52V200.62A19.41,19.41,0,0,0,39.38,220h65.18a12,12,0,0,0,0-24H44V92H212a12,12,0,0,0,24,0V88A20,20,0,0,0,216,68ZM44,68V56H90.61l10.67,12Z" />
    </svg>
  );
}

/**
 * Icône Phosphor "devices" (Bold)
 * Symbolise la gestion numérique 100% en ligne (ordinateur & mobile).
 */
export function DevicesIcon({ className, size = 24, ...props }: PhosphorIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M224,72H212V64a28,28,0,0,0-28-28H40A28,28,0,0,0,12,64v88a28,28,0,0,0,28,28h96v12a28,28,0,0,0,28,28h60a28,28,0,0,0,28-28V100A28,28,0,0,0,224,72ZM40,156a4,4,0,0,1-4-4V64a4,4,0,0,1,4-4H184a4,4,0,0,1,4,4v8H164a28,28,0,0,0-28,28v56Zm188,36a4,4,0,0,1-4,4H164a4,4,0,0,1-4-4V100a4,4,0,0,1,4-4h60a4,4,0,0,1,4,4ZM124,208a12,12,0,0,1-12,12H88a12,12,0,0,1,0-24h24A12,12,0,0,1,124,208Zm88-84a12,12,0,0,1-12,12H188a12,12,0,0,1,0-24h12A12,12,0,0,1,212,124Z" />
    </svg>
  );
}
