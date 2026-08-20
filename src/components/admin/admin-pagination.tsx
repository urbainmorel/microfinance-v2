import { Button } from "@/components/ui/button";

export function AdminPagination({
  page,
  totalPages,
  total,
  noun,
  fetching,
  setPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  fetching: boolean;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  if (total === 0) return null;
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Page {page} sur {totalPages} · {total} {noun}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || fetching}
          onClick={() => setPage((value) => value - 1)}
        >
          Précédent
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages || fetching}
          onClick={() => setPage((value) => value + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
