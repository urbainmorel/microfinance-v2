"use client";

import { CheckCircle2, Clock, Phone, User } from "lucide-react";
import { useState } from "react";

import type { SupportTicket, TicketStatus } from "@/lib/chatbot/types";

interface TicketListProps {
  tickets: SupportTicket[];
  onUpdateStatus: (id: string, status: TicketStatus) => Promise<void>;
  busy?: boolean;
}

interface TicketCardProps {
  ticket: SupportTicket;
  onUpdateStatus: (id: string, status: TicketStatus) => Promise<void>;
}

function TicketCard({ ticket, onUpdateStatus }: TicketCardProps) {
  const isHandled = ticket.status === "contacted" || ticket.status === "converted";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-lift">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-secondary text-xs font-semibold text-accent">
              <User className="size-4" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">
                {ticket.clientName}
              </h4>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3 text-accent" />
                <a
                  href={`tel:${ticket.clientPhone}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {ticket.clientPhone}
                </a>
              </div>
            </div>
          </div>

          <select
            value={ticket.status}
            onChange={(e) => onUpdateStatus(ticket.id, e.target.value as TicketStatus)}
            className="rounded-lg border border-input bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground focus:border-accent focus:outline-none"
          >
            <option value="pending">En attente</option>
            <option value="contacted">Contacté</option>
            <option value="converted">Converti en prêt</option>
            <option value="closed">Clôturé</option>
          </select>
        </div>

        <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
          <div className="mb-1 flex items-center justify-between font-semibold text-foreground">
            <span>Projet de financement</span>
            {ticket.loanAmountRequested ? (
              <span className="font-bold text-accent">
                {ticket.loanAmountRequested.toLocaleString("fr-FR")} FCFA
              </span>
            ) : null}
          </div>
          {ticket.loanPurpose ? (
            <p className="mb-2 text-muted-foreground">
              <span className="font-medium text-foreground">Objet : </span>
              {ticket.loanPurpose}
            </p>
          ) : null}
          <p className="border-t border-border/40 pt-1.5 italic text-muted-foreground">
            « {ticket.conversationSummary} »
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {new Date(ticket.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {isHandled ? (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
            <CheckCircle2 className="size-3" /> Traité
          </span>
        ) : null}
      </div>
    </div>
  );
}

const TABS = [
  { id: "ALL", label: "Toutes" },
  { id: "pending", label: "En attente" },
  { id: "contacted", label: "Contacté" },
  { id: "converted", label: "Converti en prêt" },
  { id: "closed", label: "Clôturé" },
] as const;

export function TicketList({ tickets, onUpdateStatus }: TicketListProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const filtered = tickets.filter((t) => (filter === "ALL" ? true : t.status === filter));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === tab.id
                ? "shadow-xs bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-muted-foreground shadow-card">
          Aucune demande de rappel dans cette catégorie.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onUpdateStatus={onUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
