"use client";

import { useCallback, useRef } from "react";

type PendingCommand = { fingerprint: string; key: string };

/** Sérialise les soumissions et conserve la même clé tant que la commande ne change pas. */
export function useIdempotentCommand() {
  const active = useRef(false);
  const pending = useRef<PendingCommand | null>(null);

  return useCallback(async function runIdempotent<T>(
    fingerprint: string,
    execute: (idempotencyKey: string) => Promise<T>,
  ): Promise<T | undefined> {
    if (active.current) return undefined;
    active.current = true;
    if (!pending.current || pending.current.fingerprint !== fingerprint) {
      pending.current = { fingerprint, key: crypto.randomUUID() };
    }
    try {
      const result = await execute(pending.current.key);
      pending.current = null;
      return result;
    } catch (error) {
      pending.current = null;
      throw error;
    } finally {
      active.current = false;
    }
  }, []);
}
