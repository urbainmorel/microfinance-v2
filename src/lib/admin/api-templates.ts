import { adminSupabase, rows, textValue } from "./api-client";

export type NotificationTemplate = {
  id: string;
  slug: string;
  language: "fr" | "en";
  subject: string;
  bodyHtml: string;
  variables: string[];
  updatedAt: string | null;
};

export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  const { data, error } = await adminSupabase
    .from("notification_templates")
    .select("id,slug,language,subject,body_html,variables,updated_at")
    .order("slug")
    .order("language");
  if (error) throw new Error(error.message);
  return rows(data).map((row) => ({
    id: textValue(row.id),
    slug: textValue(row.slug),
    language: row.language === "en" ? "en" : "fr",
    subject: textValue(row.subject),
    bodyHtml: textValue(row.body_html),
    variables: Array.isArray(row.variables)
      ? row.variables.filter((item): item is string => typeof item === "string")
      : [],
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  }));
}

export async function saveNotificationTemplate(
  value: Omit<NotificationTemplate, "id" | "updatedAt">,
) {
  const { error } = await adminSupabase.rpc("save_notification_template", {
    p_slug: value.slug,
    p_language: value.language,
    p_subject: value.subject,
    p_body_html: value.bodyHtml,
    p_variables: value.variables,
  });
  if (error) throw new Error(error.message);
}
