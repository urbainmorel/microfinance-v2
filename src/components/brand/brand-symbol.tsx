import Image from "next/image";

interface BrandSymbolProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function BrandSymbol({ size = 32, className = "", priority = false }: BrandSymbolProps) {
  return (
    <Image
      src="/images/brand/azari-symbol.webp"
      alt="Azari Microfinance"
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}

export function BrandLogoFull({
  width = 160,
  height = 51,
  className = "",
  priority = false,
}: {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/images/brand/azari-logo-full.webp"
      alt="Azari Microfinance - Logo officiel"
      width={width}
      height={height}
      priority={priority}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
