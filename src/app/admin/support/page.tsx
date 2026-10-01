"use client";

import { BookOpen, Headphones, PhoneCall, Settings } from "lucide-react";

import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  MutationFeedback,
} from "@/components/admin/admin-page";
import { ChatbotSettingsForm } from "@/components/admin/support/chatbot-settings-form";
import { KnowledgeManager } from "@/components/admin/support/knowledge-manager";
import { LiveChatConsole } from "@/components/admin/support/live-chat-console";
import { TicketList } from "@/components/admin/support/ticket-list";

import { useAdminSupportState, type TabId } from "./use-admin-support-state";

import type {
  ChatbotSettings,
  KnowledgeItem,
  SupportTicket,
  TicketStatus,
} from "@/lib/chatbot/types";

const TABS = [
  { id: "knowledge", label: "Base de Connaissances (RAG)", icon: BookOpen },
  { id: "settings", label: "Configuration & Marque Blanche", icon: Settings },
  { id: "live", label: "Live Chat en Direct", icon: Headphones },
  { id: "tickets", label: "Demandes de Rappel", icon: PhoneCall },
] as const;

function TabBar({
  activeTab,
  onSelect,
  pendingCount,
}: {
  activeTab: TabId;
  onSelect: (t: TabId) => void;
  pendingCount: number;
}) {
  return (
    <div className="mb-6 flex gap-2 border-b border-border pb-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const showBadge = tab.id === "tickets" && pendingCount > 0;

        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id as TabId)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
              isActive
                ? "border border-accent/20 bg-secondary text-accent"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            <span>{tab.label}</span>
            {showBadge ? (
              <span className="py-0.2 ml-1 rounded-full bg-accent px-1.5 text-[10px] text-accent-foreground">
                {pendingCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function TabContent(props: {
  activeTab: TabId;
  settings?: ChatbotSettings;
  knowledge: KnowledgeItem[];
  tickets: SupportTicket[];
  onSaveSettings: (v: ChatbotSettings) => void;
  onSaveKnowledge: (k: Partial<KnowledgeItem>) => Promise<void>;
  onDeleteKnowledge: (id: string) => Promise<void>;
  onUpdateTicket: (id: string, s: TicketStatus) => Promise<void>;
  busySettings: boolean;
  busyKnowledge: boolean;
  busyTickets: boolean;
}) {
  const {
    activeTab,
    settings,
    knowledge,
    tickets,
    onSaveSettings,
    onSaveKnowledge,
    onDeleteKnowledge,
    onUpdateTicket,
    busySettings,
    busyKnowledge,
    busyTickets,
  } = props;

  if (activeTab === "knowledge") {
    return (
      <KnowledgeManager
        items={knowledge}
        onSave={onSaveKnowledge}
        onDelete={onDeleteKnowledge}
        busy={busyKnowledge}
      />
    );
  }
  if (activeTab === "settings" && settings) {
    return <ChatbotSettingsForm initial={settings} busy={busySettings} onSave={onSaveSettings} />;
  }
  if (activeTab === "live") {
    return <LiveChatConsole />;
  }
  return <TicketList tickets={tickets} onUpdateStatus={onUpdateTicket} busy={busyTickets} />;
}

export default function AdminSupportPage() {
  const s = useAdminSupportState();

  return (
    <>
      <AdminPageHeader
        eyebrow="Service Client & IA"
        title="Support Omnicanal & Assistant IA"
        description="Gérez la base documentaire RAG, personnalisez votre assistant IA en marque blanche et prenez la main sur les échanges clients en direct."
      />

      <TabBar activeTab={s.activeTab} onSelect={s.setActiveTab} pendingCount={s.pendingCount} />

      {s.isLoading ? <AdminLoading /> : null}
      {s.isError ? <AdminError message={s.errorMsg || "Erreur de chargement."} /> : null}

      {!s.isLoading && !s.isError ? (
        <TabContent
          activeTab={s.activeTab}
          settings={s.settings}
          knowledge={s.knowledge}
          tickets={s.tickets}
          onSaveSettings={(v) => s.saveSettings.mutate(v)}
          onSaveKnowledge={async (k) => {
            await s.saveKnowledge.mutateAsync(
              k as { title: string; category: string; content: string },
            );
          }}
          onDeleteKnowledge={async (id) => {
            await s.deleteKnowledge.mutateAsync(id);
          }}
          onUpdateTicket={async (id, st) => {
            await s.updateTicket.mutateAsync({ id, status: st });
          }}
          busySettings={s.saveSettings.isPending}
          busyKnowledge={s.saveKnowledge.isPending || s.deleteKnowledge.isPending}
          busyTickets={s.updateTicket.isPending}
        />
      ) : null}

      <MutationFeedback
        error={s.saveSettings.error || s.saveKnowledge.error || s.updateTicket.error}
        success={s.saveSettings.isSuccess || s.saveKnowledge.isSuccess || s.updateTicket.isSuccess}
      />
    </>
  );
}
