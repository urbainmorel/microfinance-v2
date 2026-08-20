"use client";

import { useParams } from "next/navigation";

import { LoanContract } from "@/components/loans/loan-contract";

export default function LoanContractPage() {
  const { requestId } = useParams<{ requestId: string }>();
  return <LoanContract requestId={requestId} />;
}
