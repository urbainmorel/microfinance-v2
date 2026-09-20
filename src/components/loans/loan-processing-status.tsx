"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LoanProcessingResult } from "@/components/loans/loan-processing-result";
import { LoanProcessingAnalysis } from "@/components/loans/loan-processing-stages";
import { useSupabase } from "@/lib/hooks/use-supabase";

type LoanProcessingStatusProps = {
  requestId: string;
  onClose?: () => void;
  analysisDurationSeconds?: number;
};

export function useAnalysisTimer(durationSeconds: number, onComplete: () => void) {
  const [progress, setProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const startTime = Date.now();
    const totalMs = Math.max(1000, durationSeconds * 1000);

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
      const remainingSeconds = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));

      setProgress(currentProgress);
      setSecondsLeft(remainingSeconds);

      if (elapsedMs >= totalMs) {
        clearInterval(interval);
        setProgress(100);
        setSecondsLeft(0);
        onCompleteRef.current();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [durationSeconds]);

  return { progress, secondsLeft };
}

function useResultNavigation({
  queryClient,
  router,
  pathname,
  requestId,
  onClose,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  router: ReturnType<typeof useRouter>;
  pathname: string;
  requestId: string;
  onClose?: () => void;
}) {
  const handleGoToWallet = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      queryClient.invalidateQueries({ queryKey: ["active-loan-status"] }),
    ]);
    onClose?.();
    if (pathname === "/client/dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/client/dashboard");
    }
  };

  const handleGoToContract = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["loan-contract", requestId] }),
      queryClient.invalidateQueries({ queryKey: ["active-loan-status"] }),
    ]);
    onClose?.();
    router.push(`/client/loans/contracts/${requestId}`);
  };

  const handleGoToLoans = () => {
    void queryClient.invalidateQueries({ queryKey: ["active-loan-status"] });
    onClose?.();
    if (pathname === "/client/loans") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/client/loans");
    }
  };

  return { handleGoToWallet, handleGoToContract, handleGoToLoans };
}

export function LoanProcessingStatus({
  requestId,
  onClose,
  analysisDurationSeconds = 20,
}: LoanProcessingStatusProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const [status, setStatus] = useState<"analyzing" | "completed">("analyzing");

  const { progress, secondsLeft } = useAnalysisTimer(analysisDurationSeconds, () => {
    setStatus("completed");
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      queryClient.invalidateQueries({ queryKey: ["active-loan-status"] }),
      queryClient.invalidateQueries({ queryKey: ["active-loans-for-repayment"] }),
      queryClient.invalidateQueries({ queryKey: ["loan-request-status", requestId] }),
    ]);
  });

  const { data: loanRequest } = useQuery({
    queryKey: ["loan-request-status", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_requests")
        .select("id, status, amount, approved_amount")
        .eq("id", requestId)
        .single();
      if (error) return null;
      return data;
    },
    refetchInterval: status === "analyzing" ? 2000 : false,
  });

  const { handleGoToWallet, handleGoToContract, handleGoToLoans } = useResultNavigation({
    queryClient,
    router,
    pathname,
    requestId,
    onClose,
  });

  if (status === "completed") {
    return (
      <LoanProcessingResult
        requestId={requestId}
        loanRequest={loanRequest}
        onGoToWallet={handleGoToWallet}
        onGoToContract={handleGoToContract}
        onGoToLoans={handleGoToLoans}
      />
    );
  }

  return (
    <LoanProcessingAnalysis requestId={requestId} secondsLeft={secondsLeft} progress={progress} />
  );
}
