import { Skeleton } from "@/components/ui/skeleton";

/** Squelette de la carte portefeuille (DESIGN §15) pendant le premier chargement. */
export function WalletCardSkeleton() {
  return <Skeleton className="h-[236px] w-full rounded-2xl" />;
}
