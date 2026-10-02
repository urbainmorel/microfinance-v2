"use client";

import { StorageConfirmModal } from "@/components/admin/storage-confirm-modal";
import { StorageDateFilterSection } from "@/components/admin/storage-filter-section";
import { StorageGaugeSection } from "@/components/admin/storage-gauge-section";
import { useStorageCleaner } from "@/components/admin/use-storage-cleaner";
import { calculateStorageUsage, STORAGE_QUOTA_BYTES } from "@/lib/admin/storage-utils";

import type { StorageStats } from "@/lib/admin/api-storage";

export function StorageCleaner({ initialStats }: { initialStats?: StorageStats }) {
  const {
    stats,
    isLoading,
    error,
    startDate,
    endDate,
    dateError,
    isEstimating,
    estimate,
    isConfirmOpen,
    setIsConfirmOpen,
    isPurging,
    purgeFeedback,
    canPurge,
    handleStartDate,
    handleEndDate,
    handleConfirmPurge,
    reloadStats,
  } = useStorageCleaner(initialStats);

  const usage = calculateStorageUsage(
    stats?.totalBytes ?? 0,
    stats?.quotaBytes ?? STORAGE_QUOTA_BYTES,
  );

  return (
    <div className="space-y-6">
      <StorageGaugeSection
        usage={usage}
        totalFiles={stats?.totalFiles ?? 0}
        isLoading={isLoading}
        onRefresh={() => void reloadStats()}
      />
      <StorageDateFilterSection
        startDate={startDate}
        endDate={endDate}
        dateError={dateError}
        isEstimating={isEstimating}
        estimate={estimate}
        purgeFeedback={purgeFeedback}
        error={error}
        canPurge={canPurge}
        onStartDateChange={handleStartDate}
        onEndDateChange={handleEndDate}
        onRequestPurge={() => setIsConfirmOpen(true)}
      />
      <StorageConfirmModal
        open={isConfirmOpen}
        isPurging={isPurging}
        count={estimate?.count ?? 0}
        bytes={estimate?.bytes ?? 0}
        startDate={startDate}
        endDate={endDate}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => void handleConfirmPurge()}
      />
    </div>
  );
}
