"use client";

import { useParams } from "next/navigation";

import { ClientLoanDetail } from "@/components/loans/client-loan-detail";

export default function ClientLoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ClientLoanDetail id={id} />;
}
