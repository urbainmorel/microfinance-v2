import { createClient } from "@supabase/supabase-js";

export type AuthEmailSettings = {
  resendApiKey: string;
  brevoApiKey: string;
  hookSecret: string;
  resendFrom: string;
  brevoFrom: string;
  siteUrl: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSettings: { value: AuthEmailSettings; expiresAt: number } | null = null;

function environmentValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function validHttpOrigin(value: string, fallback: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    // Repli ci-dessous.
  }
  return fallback;
}

function environmentSettings(): AuthEmailSettings {
  return {
    resendApiKey: environmentValue("RESEND_API_KEY"),
    brevoApiKey: environmentValue("BREVO_API_KEY"),
    hookSecret: environmentValue("SEND_EMAIL_HOOK_SECRET"),
    resendFrom:
      environmentValue("RESEND_FROM") ||
      "Azari Microfinance <noreply@mail.azari-microfinance.site>",
    brevoFrom:
      environmentValue("BREVO_FROM") ||
      environmentValue("EMAIL_FROM") ||
      "Azari Microfinance <support@azari-microfinance.site>",
    siteUrl: validHttpOrigin(
      environmentValue("APP_URL") || environmentValue("NEXT_PUBLIC_APP_URL"),
      "https://azari-microfinance.site",
    ),
  };
}

async function databaseSettings(): Promise<Record<string, string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) return {};

  try {
    const client = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.from("auth_email_settings").select("key,value");
    if (error) return {};

    const rows = (data ?? []) as Array<{ key?: unknown; value?: unknown }>;
    return Object.fromEntries(
      rows
        .filter(
          (row): row is { key: string; value: string } =>
            typeof row.key === "string" && typeof row.value === "string",
        )
        .map((row) => [row.key, row.value]),
    );
  } catch {
    return {};
  }
}

/**
 * Réglages du Send Email Hook. Les secrets sont stockés dans
 * public.auth_email_settings (service_role uniquement) et peuvent être
 * surchargés localement par les variables d'environnement.
 */
export async function getAuthEmailSettings(): Promise<AuthEmailSettings> {
  if (cachedSettings && cachedSettings.expiresAt > Date.now()) {
    return cachedSettings.value;
  }

  const environment = environmentSettings();
  const database = await databaseSettings();
  const siteUrl = validHttpOrigin(database.site_url || environment.siteUrl, environment.siteUrl);

  const value: AuthEmailSettings = {
    resendApiKey: database.resend_api_key || environment.resendApiKey,
    brevoApiKey: database.brevo_api_key || environment.brevoApiKey,
    hookSecret: database.send_email_hook_secret || environment.hookSecret,
    resendFrom: database.resend_from || environment.resendFrom,
    brevoFrom: database.brevo_from || environment.brevoFrom,
    siteUrl,
  };

  if (!value.resendApiKey || !value.brevoApiKey || !value.hookSecret) {
    throw new Error("Configuration du Send Email Hook incomplète.");
  }

  cachedSettings = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export function clearAuthEmailSettingsCache(): void {
  cachedSettings = null;
}
