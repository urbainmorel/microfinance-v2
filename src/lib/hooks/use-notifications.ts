"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSessionUser } from "@/lib/hooks/use-session-user";
import { useSupabase } from "@/lib/hooks/use-supabase";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

/** Liste des notifications in-app (PRD §15.1), plus récentes d'abord. Revalidation 10 s. */
export function useNotifications() {
  const supabase = useSupabase();
  const { data: user } = useSessionUser();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    refetchInterval: 10_000,
    queryFn: async (): Promise<NotificationRow[]> => {
      const userId = user?.id;
      if (!userId) throw new Error("Utilisateur non identifié");
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });
}

/** Marque les notifications non lues comme lues (colonne read_at, seule écriture permise). */
export function useMarkNotificationsRead() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: user } = useSessionUser();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}
