import * as React from "react";

import { cn } from "@/lib/utils";

export type MobileOperator = "WAVE" | "MTN" | "ORANGE" | "MOOV";

export const MOBILE_OPERATORS: Array<{
  id: MobileOperator;
  name: string;
  shortLabel: string;
  badgeColor: string;
}> = [
  {
    id: "WAVE",
    name: "Wave",
    shortLabel: "Wave",
    badgeColor: "bg-[#1DC3EC]/15 border-[#1DC3EC]/40 text-[#0084A8] dark:text-[#1DC3EC]",
  },
  {
    id: "MTN",
    name: "MTN MoMo",
    shortLabel: "MTN",
    badgeColor: "bg-[#FFCC00]/20 border-[#FFCC00]/50 text-[#8F6B00] dark:text-[#FFCC00]",
  },
  {
    id: "ORANGE",
    name: "Orange Money",
    shortLabel: "Orange",
    badgeColor: "bg-[#FF7900]/15 border-[#FF7900]/40 text-[#C45500] dark:text-[#FF7900]",
  },
  {
    id: "MOOV",
    name: "Moov Money",
    shortLabel: "Moov",
    badgeColor: "bg-[#0066B3]/15 border-[#0066B3]/40 text-[#0066B3] dark:text-[#3B96E0]",
  },
];

function WaveSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="100" height="32" rx="7" fill="#1DC3EC" />
      <g transform="translate(8, 4)">
        <circle cx="12" cy="12" r="11" fill="#FFFFFF" />
        <ellipse cx="12" cy="13" rx="7" ry="8.5" fill="#1E232A" />
        <ellipse cx="12" cy="14.5" rx="4.5" ry="6" fill="#FFFFFF" />
        <circle cx="10" cy="9.5" r="1.5" fill="#FFFFFF" />
        <circle cx="10.2" cy="9.5" r="0.8" fill="#1E232A" />
        <polygon points="12,10.5 15.5,11.8 12,13" fill="#FF9900" />
      </g>
      <text
        x="42"
        y="21"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="16"
        fill="#FFFFFF"
        letterSpacing="-0.5"
      >
        wave
      </text>
    </svg>
  );
}

function MtnMomoSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="100" height="32" rx="7" fill="#FFCC00" />
      <g transform="translate(6, 4)">
        <ellipse cx="15" cy="12" rx="13" ry="9" fill="none" stroke="#002B49" strokeWidth="2.2" />
        <text
          x="15"
          y="16"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="9"
          fill="#002B49"
          textAnchor="middle"
          letterSpacing="-0.3"
        >
          MTN
        </text>
      </g>
      <text
        x="42"
        y="21"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="15"
        fill="#002B49"
        letterSpacing="-0.5"
      >
        MoMo
      </text>
    </svg>
  );
}

function OrangeMoneySvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 108 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="108" height="32" rx="7" fill="#1E1E1E" />
      <g transform="translate(6, 6)">
        <rect width="20" height="20" rx="3.5" fill="#FF7900" />
        <rect x="3" y="3" width="7" height="7" fill="#FFFFFF" />
      </g>
      <text
        x="32"
        y="16"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="11"
        fill="#FF7900"
        letterSpacing="-0.2"
      >
        orange
      </text>
      <text
        x="32"
        y="25"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="8.5"
        fill="#FFFFFF"
        letterSpacing="0.8"
      >
        MONEY
      </text>
    </svg>
  );
}

function MoovMoneySvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 104 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="104" height="32" rx="7" fill="#0066B3" />
      <g transform="translate(6, 5)">
        <circle cx="11" cy="11" r="10" fill="#F37021" />
        <path
          d="M7 11C7 8.5 9 7 11 7C13 7 15 8.5 15 11"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="11" cy="13" r="1.5" fill="#FFFFFF" />
      </g>
      <text
        x="32"
        y="16"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="11"
        fill="#F37021"
        letterSpacing="-0.2"
      >
        moov
      </text>
      <text
        x="32"
        y="25"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="8.5"
        fill="#FFFFFF"
        letterSpacing="0.6"
      >
        MONEY
      </text>
    </svg>
  );
}

export function OperatorLogo({
  operator,
  className,
}: {
  operator?: string | null;
  className?: string;
}) {
  const norm = (operator ?? "").trim().toUpperCase();
  if (norm === "WAVE") return <WaveSvg className={cn("h-7 w-auto", className)} />;
  if (norm === "MTN") return <MtnMomoSvg className={cn("h-7 w-auto", className)} />;
  if (norm === "ORANGE") return <OrangeMoneySvg className={cn("h-7 w-auto", className)} />;
  if (norm === "MOOV") return <MoovMoneySvg className={cn("h-7 w-auto", className)} />;
  return null;
}
