"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getStorageStats,
  purgeStorageRange,
  type PurgeResult,
  type StorageStats,
} from "@/lib/admin/api-storage";
import { formatBytes, validateDateRange } from "@/lib/admin/storage-utils";

function usePurgeMutation(onSuccess: () => Promise<void>) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executePurge = async (startDate: string, endDate: string) => {
    try {
      setIsPurging(true);
      setError(null);
      const result: PurgeResult = await purgeStorageRange(startDate, endDate);
      setIsConfirmOpen(false);
      setPurgeFeedback(
        `${result.deletedCount} fichier(s) supprimé(s), ${formatBytes(result.freedBytes)} libéré(s).`,
      );
      await onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Échec de suppression.");
      setIsConfirmOpen(false);
    } finally {
      setIsPurging(false);
    }
  };

  return {
    isConfirmOpen,
    setIsConfirmOpen,
    isPurging,
    purgeFeedback,
    purgeError: error,
    executePurge,
  };
}

function useDateRangeEstimate(startDate: string, endDate: string) {
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{ count: number; bytes: number } | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    const val = validateDateRange(startDate, endDate);
    if (!val.valid) return;

    let active = true;
    const timer = setTimeout(() => {
      setIsEstimating(true);
      getStorageStats({ startDate, endDate })
        .then((data) => {
          if (active) {
            setEstimate({ count: data.matchingFiles, bytes: data.matchingBytes });
            setIsEstimating(false);
          }
        })
        .catch(() => {
          if (active) setIsEstimating(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [startDate, endDate]);

  return { isEstimating, estimate, clearEstimate: () => setEstimate(null) };
}

export function useStorageCleaner(initialStats?: StorageStats) {
  const [stats, setStats] = useState<StorageStats | null>(initialStats ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { isEstimating, estimate, clearEstimate } = useDateRangeEstimate(startDate, endDate);

  const reloadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await getStorageStats();
      setStats(data);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const purge = usePurgeMutation(async () => {
    setStartDate("");
    setEndDate("");
    clearEstimate();
    await reloadStats();
  });

  useEffect(() => {
    let active = true;
    if (!initialStats) {
      getStorageStats()
        .then((data) => {
          if (active) setStats(data);
        })
        .catch((err: unknown) => {
          if (active) setLoadError(err instanceof Error ? err.message : "Erreur.");
        });
    }
    return () => {
      active = false;
    };
  }, [initialStats]);

  const dateVal = startDate && endDate ? validateDateRange(startDate, endDate) : null;
  const canPurge = Boolean(dateVal?.valid && estimate && estimate.count > 0 && !purge.isPurging);

  return {
    stats,
    isLoading,
    error: loadError || purge.purgeError,
    startDate,
    endDate,
    dateError: dateVal && !dateVal.valid ? dateVal.error : undefined,
    isEstimating,
    estimate,
    isConfirmOpen: purge.isConfirmOpen,
    setIsConfirmOpen: purge.setIsConfirmOpen,
    isPurging: purge.isPurging,
    purgeFeedback: purge.purgeFeedback,
    canPurge,
    handleStartDate: (val: string) => {
      setStartDate(val);
      if (!val || !endDate) clearEstimate();
    },
    handleEndDate: (val: string) => {
      setEndDate(val);
      if (!startDate || !val) clearEstimate();
    },
    handleConfirmPurge: () => purge.executePurge(startDate, endDate),
    reloadStats,
  };
}
