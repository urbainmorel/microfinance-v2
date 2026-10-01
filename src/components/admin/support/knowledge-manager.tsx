"use client";

import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { KnowledgeFormModal } from "./knowledge-form-modal";

import type { KnowledgeItem } from "@/lib/chatbot/types";

interface KnowledgeManagerProps {
  items: KnowledgeItem[];
  onSave: (item: {
    id?: string;
    title: string;
    category: string;
    content: string;
    isActive?: boolean;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy?: boolean;
}

interface RowProps {
  item: KnowledgeItem;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (id: string, title: string) => void;
}

function KnowledgeRow({ item, onEdit, onDelete }: RowProps) {
  return (
    <tr className="transition-colors hover:bg-muted/20">
      <td className="px-4 py-3 font-semibold text-foreground">{item.title}</td>
      <td className="px-4 py-3">
        <span className="inline-block rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground">
          {item.category}
        </span>
      </td>
      <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">{item.content}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            item.isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`}
          />
          {item.isActive ? "Active" : "Désactivée"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Modifier la fiche"
          >
            <Edit className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id, item.title)}
            className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            title="Supprimer la fiche"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

interface TableProps {
  items: KnowledgeItem[];
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (id: string, title: string) => void;
}

function KnowledgeTable({ items, onEdit, onDelete }: TableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3.5">Fiche Documentaire</th>
              <th className="px-4 py-3.5">Catégorie</th>
              <th className="px-4 py-3.5">Extrait</th>
              <th className="px-4 py-3.5">Statut</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  Aucune fiche de connaissances trouvée.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <KnowledgeRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KnowledgeManager({ items, onSave, onDelete, busy = false }: KnowledgeManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [items, search, selectedCategory]);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la fiche "${title}" ?`)) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une fiche ou un mot-clé…"
              className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-xs text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="ALL">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          <span>Ajouter une fiche</span>
        </button>
      </div>

      <KnowledgeTable
        items={filteredItems}
        onEdit={(item) => {
          setEditingItem(item);
          setIsModalOpen(true);
        }}
        onDelete={handleDelete}
      />

      <KnowledgeFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initial={editingItem}
        onSave={onSave}
        busy={busy}
      />
    </div>
  );
}
