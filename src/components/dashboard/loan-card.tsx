import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Carte « Mon prêt » — État 1 (aucun prêt en cours), PRD §9 / DESIGN §11.2.
 * Les états 2–10 (via `get_active_loan_status`) arrivent au Lot 6.
 */
export function LoanCard() {
  return (
    <Card>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Mon prêt
      </p>
      <p className="mt-2 text-sm text-foreground">Vous n’avez aucun prêt en cours.</p>
      <Link
        href="/client/loans"
        className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-4 w-full")}
      >
        Demander un prêt
      </Link>
    </Card>
  );
}
