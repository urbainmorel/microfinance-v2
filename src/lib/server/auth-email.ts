import { readFile } from "node:fs/promises";
import path from "node:path";

import { wrapInEmailLayout } from "@/lib/email-layout";

import type { AuthEmailSettings } from "./auth-email-settings";

export type SupabaseAuthEmailPayload = {
  user?: {
    id?: unknown;
    email?: unknown;
    new_email?: unknown;
    user_metadata?: Record<string, unknown> | null;
  };
  email_data?: {
    token?: unknown;
    token_hash?: unknown;
    redirect_to?: unknown;
    email_action_type?: unknown;
    site_url?: unknown;
    token_new?: unknown;
    token_hash_new?: unknown;
    old_email?: unknown;
    old_phone?: unknown;
    provider?: unknown;
    factor_type?: unknown;
  };
};

export type AuthEmailMessage = {
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
};

const TEMPLATE_FILES: Record<string, string> = {
  signup: "confirmation.html",
  email: "confirmation.html",
  recovery: "recovery.html",
  magiclink: "magic_link.html",
  email_change: "email_change.html",
  invite: "invite.html",
};

const AUTH_SUBJECTS: Record<string, string> = {
  signup: "Confirmez votre compte - Azari Microfinance",
  email: "Confirmez votre compte - Azari Microfinance",
  recovery: "Réinitialisation de votre mot de passe - Azari Microfinance",
  magiclink: "Connexion instantanée - Azari Microfinance",
  email_change: "Confirmation de changement d'email - Azari Microfinance",
  invite: "Invitation à rejoindre Azari Microfinance",
  reauthentication: "Votre code de vérification - Azari Microfinance",
};

const NOTIFICATION_SUBJECTS: Record<string, string> = {
  password_changed_notification: "Votre mot de passe a été modifié - Azari Microfinance",
  email_changed_notification: "Votre adresse e-mail a été modifiée - Azari Microfinance",
  phone_changed_notification: "Votre numéro de téléphone a été modifié - Azari Microfinance",
  identity_linked_notification: "Nouvelle méthode de connexion - Azari Microfinance",
  identity_unlinked_notification: "Méthode de connexion supprimée - Azari Microfinance",
  mfa_factor_enrolled_notification: "Nouvelle vérification de sécurité - Azari Microfinance",
  mfa_factor_unenrolled_notification: "Vérification de sécurité supprimée - Azari Microfinance",
};

const templateCache = new Map<string, string>();

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadTemplate(action: string): Promise<string> {
  const file = TEMPLATE_FILES[action];
  if (!file) throw new Error(`Modèle Auth absent pour ${action}.`);

  const cached = templateCache.get(file);
  if (cached) return cached;

  const content = await readFile(path.join(process.cwd(), "supabase", "templates", file), "utf8");
  templateCache.set(file, content);
  return content;
}

function confirmationUrl(siteUrl: string, tokenHash: string, type: string): string {
  const url = new URL("/auth/confirm", siteUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}

function renderTemplate(
  template: string,
  values: {
    siteUrl: string;
    token: string;
    tokenHash: string;
    email: string;
    newEmail: string;
    oldEmail: string;
    confirmationUrl: string;
    redirectTo: string;
  },
): string {
  return template
    .replaceAll("{{ .SiteURL }}", escapeHtml(values.siteUrl))
    .replaceAll("{{ .TokenHash }}", escapeHtml(values.tokenHash))
    .replaceAll("{{ .Token }}", escapeHtml(values.token))
    .replaceAll("{{ .Email }}", escapeHtml(values.email))
    .replaceAll("{{ .NewEmail }}", escapeHtml(values.newEmail))
    .replaceAll("{{ .OldEmail }}", escapeHtml(values.oldEmail))
    .replaceAll("{{ .ConfirmationURL }}", escapeHtml(values.confirmationUrl))
    .replaceAll("{{ .RedirectTo }}", escapeHtml(values.redirectTo));
}

function notificationMessage(action: string, payload: SupabaseAuthEmailPayload): string {
  const user = payload.user ?? {};
  const data = payload.email_data ?? {};
  const email = stringValue(user.email);
  const oldEmail = stringValue(data.old_email);
  const oldPhone = stringValue(data.old_phone);
  const provider = stringValue(data.provider);
  const factorType = stringValue(data.factor_type);

  switch (action) {
    case "password_changed_notification":
      return `Le mot de passe de ${email || "votre compte"} a été modifié. Si vous n'êtes pas à l'origine de ce changement, réinitialisez votre mot de passe et contactez immédiatement le support.`;
    case "email_changed_notification":
      return `L'adresse e-mail de votre compte a été modifiée${oldEmail ? ` (ancienne adresse : ${oldEmail})` : ""}. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support.`;
    case "phone_changed_notification":
      return `Le numéro de téléphone de votre compte a été modifié${oldPhone ? ` (ancien numéro : ${oldPhone})` : ""}. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement le support.`;
    case "identity_linked_notification":
      return `Une nouvelle méthode de connexion${provider ? ` (${provider})` : ""} a été ajoutée à votre compte. Si vous n'êtes pas à l'origine de cette action, contactez immédiatement le support.`;
    case "identity_unlinked_notification":
      return `Une méthode de connexion${provider ? ` (${provider})` : ""} a été supprimée de votre compte. Si vous n'êtes pas à l'origine de cette action, contactez immédiatement le support.`;
    case "mfa_factor_enrolled_notification":
      return `Une vérification de sécurité supplémentaire${factorType ? ` (${factorType})` : ""} a été ajoutée à votre compte. Si vous n'êtes pas à l'origine de cette action, contactez immédiatement le support.`;
    case "mfa_factor_unenrolled_notification":
      return `Une vérification de sécurité supplémentaire${factorType ? ` (${factorType})` : ""} a été supprimée de votre compte. Si vous n'êtes pas à l'origine de cette action, contactez immédiatement le support.`;
    default:
      return "Une activité de sécurité a été enregistrée sur votre compte. Si vous ne reconnaissez pas cette activité, contactez immédiatement le support.";
  }
}

function notificationEmail(
  action: string,
  payload: SupabaseAuthEmailPayload,
  settings: AuthEmailSettings,
): AuthEmailMessage {
  const recipientEmail = stringValue(payload.user?.email);
  if (!recipientEmail) throw new Error("Destinataire Auth absent.");

  const subject = NOTIFICATION_SUBJECTS[action] || "Activité de sécurité - Azari Microfinance";
  const message = notificationMessage(action, payload);
  const html = wrapInEmailLayout(
    `<p style="margin:0;color:#334155;line-height:1.6">${escapeHtml(message)}</p>`,
    {
      subject,
      previewText: subject,
      baseUrl: settings.siteUrl,
      platformName: "Azari Microfinance",
      supportEmail: "support@azari-microfinance.site",
    },
  );

  return { recipientEmail, subject, html, text: htmlToText(html) };
}

function reauthenticationEmail(
  payload: SupabaseAuthEmailPayload,
  settings: AuthEmailSettings,
): AuthEmailMessage {
  const recipientEmail = stringValue(payload.user?.email);
  const token = stringValue(payload.email_data?.token);
  if (!recipientEmail) throw new Error("Destinataire Auth absent.");
  if (!/^\d{6}$/.test(token)) throw new Error("Code de réauthentification absent.");

  const subject =
    AUTH_SUBJECTS.reauthentication ?? "Votre code de vérification - Azari Microfinance";
  const html = wrapInEmailLayout(
    `<p style="margin:0 0 16px;color:#334155;line-height:1.6">Saisissez ce code pour confirmer votre identité :</p>
     <div style="margin:0;padding:18px 20px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;text-align:center">
       <p style="margin:0;color:#0f172a;font-family:Consolas,Monaco,monospace;font-size:32px;font-weight:800;letter-spacing:.28em">${escapeHtml(token)}</p>
     </div>
     <p style="margin:20px 0 0;color:#64748b;font-size:13px;line-height:1.5">Ce code est personnel et expire rapidement. Ne le partagez jamais.</p>`,
    {
      subject,
      previewText: subject,
      baseUrl: settings.siteUrl,
      platformName: "Azari Microfinance",
      supportEmail: "support@azari-microfinance.site",
    },
  );

  return { recipientEmail, subject, html, text: htmlToText(html) };
}

async function templateEmail(
  action: string,
  payload: SupabaseAuthEmailPayload,
  settings: AuthEmailSettings,
  options: {
    recipientEmail: string;
    token: string;
    tokenHash: string;
    email: string;
    newEmail: string;
    type: string;
  },
): Promise<AuthEmailMessage> {
  const template = await loadTemplate(action);
  const subject = AUTH_SUBJECTS[action] ?? AUTH_SUBJECTS.signup ?? "Azari Microfinance";
  const siteUrl = settings.siteUrl;
  const redirectTo = stringValue(payload.email_data?.redirect_to);
  const html = renderTemplate(template, {
    siteUrl,
    token: options.token,
    tokenHash: options.tokenHash,
    email: options.email,
    newEmail: options.newEmail,
    oldEmail: stringValue(payload.email_data?.old_email),
    confirmationUrl: confirmationUrl(siteUrl, options.tokenHash, options.type),
    redirectTo,
  });

  return {
    recipientEmail: options.recipientEmail,
    subject,
    html,
    text: htmlToText(html),
  };
}

export async function renderAuthEmails(
  payload: SupabaseAuthEmailPayload,
  settings: AuthEmailSettings,
): Promise<AuthEmailMessage[]> {
  const user = payload.user ?? {};
  const data = payload.email_data ?? {};
  const action = stringValue(data.email_action_type) || "security";
  const email = stringValue(user.email);
  const newEmail = stringValue(user.new_email);
  const token = stringValue(data.token);
  const tokenNew = stringValue(data.token_new);
  const tokenHash = stringValue(data.token_hash);
  const tokenHashNew = stringValue(data.token_hash_new);

  if (action === "email_change") {
    const messages: AuthEmailMessage[] = [];
    if (email && tokenHashNew) {
      messages.push(
        await templateEmail(action, payload, settings, {
          recipientEmail: email,
          token,
          tokenHash: tokenHashNew,
          email,
          newEmail,
          type: "email_change",
        }),
      );
    }
    if (newEmail && tokenHash) {
      messages.push(
        await templateEmail(action, payload, settings, {
          recipientEmail: newEmail,
          token: tokenNew || token,
          tokenHash,
          email,
          newEmail,
          type: "email_change",
        }),
      );
    }
    if (!messages.length && newEmail && tokenHash) {
      messages.push(
        await templateEmail(action, payload, settings, {
          recipientEmail: newEmail,
          token: tokenNew || token,
          tokenHash,
          email,
          newEmail,
          type: "email_change",
        }),
      );
    }
    if (!messages.length) throw new Error("Destinataire ou jeton de changement d'e-mail absent.");
    return messages;
  }

  if (!email) throw new Error("Destinataire Auth absent.");

  if (action === "reauthentication") {
    return [reauthenticationEmail(payload, settings)];
  }

  if (action in NOTIFICATION_SUBJECTS || action.endsWith("_notification")) {
    return [notificationEmail(action, payload, settings)];
  }

  const type = action === "signup" || action === "email" ? "signup" : action;
  if (!tokenHash) throw new Error("Jeton Auth absent.");

  return [
    await templateEmail(action, payload, settings, {
      recipientEmail: email,
      token,
      tokenHash,
      email,
      newEmail,
      type,
    }),
  ];
}
