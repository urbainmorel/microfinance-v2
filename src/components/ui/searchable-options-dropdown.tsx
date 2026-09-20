"use client";

import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export function SearchInputRow({
  fieldId,
  value,
  placeholder,
  open,
  error,
  errorId,
  onChange,
  onFocus,
  onKeyDown,
  onClear,
  onToggle,
}: {
  fieldId: string;
  value: string;
  placeholder?: string;
  open: boolean;
  error?: string;
  errorId?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        id={fieldId}
        type="text"
        role="combobox"
        aria-controls={`${fieldId}-listbox`}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "flex h-[52px] w-full rounded-xl border border-input bg-card px-4 pr-16 text-base font-medium text-foreground",
          "shadow-[0_1px_2px_rgba(15,23,42,0.025)] transition-[border-color,box-shadow]",
          "placeholder:font-normal placeholder:text-muted-foreground/75",
          "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/10",
          "aria-[invalid=true]:border-warning/60",
        )}
      />
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Effacer le pays sélectionné"
            title="Effacer"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Ouvrir la liste"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}

export function OptionsDropdownList({
  listId,
  options,
  selectedValue,
  activeIndex,
  onSelect,
}: {
  listId: string;
  options: readonly Option[];
  selectedValue?: string;
  activeIndex: number;
  onSelect: (opt: Option) => void;
}) {
  if (options.length === 0) {
    return <div className="p-4 text-center text-xs text-muted-foreground">Aucun pays trouvé</div>;
  }

  return (
    <ul id={listId} role="listbox" className="flex flex-col gap-0.5 p-1.5">
      {options.map((opt, idx) => {
        const isSelected = opt.value === selectedValue;
        const isActive = idx === activeIndex;
        return (
          <li
            key={opt.value}
            role="option"
            aria-selected={isSelected}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(opt);
            }}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-accent/15 text-accent-foreground" : "text-foreground",
              isSelected ? "font-semibold text-accent" : "",
              "hover:bg-accent/10",
            )}
          >
            <span>{opt.label}</span>
            {isSelected ? <Check className="size-4 text-accent" aria-hidden /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function SearchDropdownPopup({
  listId,
  open,
  options,
  selectedValue,
  activeIndex,
  onSelect,
}: {
  listId: string;
  open: boolean;
  options: readonly Option[];
  selectedValue?: string;
  activeIndex: number;
  onSelect: (opt: Option) => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute top-[80px] z-50 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-xl backdrop-blur-md">
      <OptionsDropdownList
        listId={listId}
        options={options}
        selectedValue={selectedValue}
        activeIndex={activeIndex}
        onSelect={onSelect}
      />
    </div>
  );
}
