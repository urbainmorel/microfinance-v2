import Link from "next/link";

import { OperationsList } from "@/components/operations/operations-list";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OperationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-foreground">Mes opérations</h1>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/client/deposit/request"
          className={cn(buttonVariants({ variant: "accent", size: "sm" }), "w-full")}
        >
          Faire un dépôt
        </Link>
        <Link
          href="/client/repay/request"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
        >
          Rembourser
        </Link>
      </div>
      <OperationsList />
    </div>
  );
}
