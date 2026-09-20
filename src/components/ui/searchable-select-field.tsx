"use client";

import { AlertCircle } from "lucide-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";

import { SearchDropdownPopup, SearchInputRow } from "@/components/ui/searchable-options-dropdown";

type Option = { value: string; label: string };

type Props = {
  id?: string;
  label: string;
  options: readonly Option[];
  value?: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

function cleanText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filterOptions(options: readonly Option[], query: string): readonly Option[] {
  const q = cleanText(query);
  if (!q) return options;
  return options.filter(
    (opt) => cleanText(opt.label).includes(q) || cleanText(opt.value).includes(q),
  );
}

function getNextIndex(key: "ArrowDown" | "ArrowUp", length: number, current: number): number {
  if (length === 0) return -1;
  if (key === "ArrowDown") return current + 1 < length ? current + 1 : 0;
  return current > 0 ? current - 1 : length - 1;
}

function handleKeyNav(
  e: React.KeyboardEvent<HTMLInputElement>,
  open: boolean,
  filtered: readonly Option[],
  activeIndex: number,
  setOpen: (o: boolean) => void,
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>,
  onSelect: (opt: Option) => void,
  onClose: () => void,
) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    setActiveIndex((prev) => getNextIndex(e.key as "ArrowDown" | "ArrowUp", filtered.length, prev));
    return;
  }
  if (e.key === "Enter" && open && activeIndex >= 0 && filtered[activeIndex]) {
    e.preventDefault();
    onSelect(filtered[activeIndex]);
    return;
  }
  if (e.key === "Escape") {
    onClose();
  }
}

function useSearchableCombobox(
  options: readonly Option[],
  value: string | undefined,
  onChange: (value: string) => void,
  onBlur?: () => void,
) {
  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = typedQuery ?? selectedOption?.label ?? "";
  const filtered = useMemo(() => {
    if (typedQuery === null) return options;
    return filterOptions(options, query);
  }, [options, typedQuery, query]);

  const handleSelect = useCallback(
    (opt: Option) => {
      onChange(opt.value);
      setTypedQuery(null);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onChange],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setTypedQuery(null);
    onBlur?.();
  }, [onBlur]);

  return {
    query,
    open,
    activeIndex,
    filtered,
    setOpen,
    setActiveIndex,
    setTypedQuery,
    handleSelect,
    handleClose,
  };
}

function useSearchableInputHandlers({
  setTypedQuery,
  setOpen,
  setActiveIndex,
  onChange,
  open,
  filtered,
  activeIndex,
  handleSelect,
  handleClose,
}: {
  setTypedQuery: (q: string) => void;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  onChange: (v: string) => void;
  open: boolean;
  filtered: readonly Option[];
  activeIndex: number;
  handleSelect: (opt: Option) => void;
  handleClose: () => void;
}) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedQuery(e.target.value);
    setOpen(true);
    setActiveIndex(0);
    if (!e.target.value) onChange("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleKeyNav(
      e,
      open,
      filtered,
      activeIndex,
      setOpen,
      setActiveIndex,
      handleSelect,
      handleClose,
    );
  };

  const handleClear = () => {
    onChange("");
    setTypedQuery("");
    setOpen(true);
  };

  return { handleInputChange, handleInputKeyDown, handleClear };
}

function FieldErrorNotice({ id, error }: { id?: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 text-xs font-semibold text-warning">
      <AlertCircle className="size-3.5" strokeWidth={1.8} aria-hidden />
      {error}
    </p>
  );
}

export function SearchableSelectField({
  id,
  label,
  options,
  value,
  placeholder = "Rechercher…",
  error,
  onChange,
  onBlur,
}: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    open,
    activeIndex,
    filtered,
    setOpen,
    setActiveIndex,
    setTypedQuery,
    handleSelect,
    handleClose,
  } = useSearchableCombobox(options, value, onChange, onBlur);

  const { handleInputChange, handleInputKeyDown, handleClear } = useSearchableInputHandlers({
    setTypedQuery,
    setOpen,
    setActiveIndex,
    onChange,
    open,
    filtered,
    activeIndex,
    handleSelect,
    handleClose,
  });

  function handleContainerBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      handleClose();
    }
  }

  return (
    <div ref={containerRef} onBlur={handleContainerBlur} className="relative flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-[13px] font-semibold text-foreground">
        {label}
      </label>
      <SearchInputRow
        fieldId={fieldId}
        value={query}
        placeholder={placeholder}
        open={open}
        error={error}
        errorId={errorId}
        onChange={handleInputChange}
        onFocus={(e) => {
          setOpen(true);
          e.currentTarget.select();
        }}
        onKeyDown={handleInputKeyDown}
        onClear={handleClear}
        onToggle={() => setOpen((prev) => !prev)}
      />

      <SearchDropdownPopup
        listId={`${fieldId}-listbox`}
        open={open}
        options={filtered}
        selectedValue={value}
        activeIndex={activeIndex}
        onSelect={handleSelect}
      />

      <FieldErrorNotice id={errorId} error={error} />
    </div>
  );
}
