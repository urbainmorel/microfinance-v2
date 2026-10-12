/**
 * Gabarit de courriel unifié pour Azari Microfinance.
 * Conçu pour un rendu sobre, moderne, raffiné et compatible tous clients mails.
 */

export interface EmailLayoutOptions {
  subject?: string;
  previewText?: string;
  language?: string;
  templateSlug?: string;
  platformName?: string;
  supportEmail?: string;
  baseUrl?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getI18nLabels(isEn: boolean) {
  if (isEn) {
    return {
      badge: "Official Notification",
      secTitle: "Security reminder",
      secNotice:
        "Azari Microfinance will never ask you for your password, PIN code or OTP code by phone, email or SMS. Keep your credentials private.",
      regulated: "Regulated Microfinance Institution (UMOA).",
      help: "Need assistance?",
      contact: "Contact our support at",
      dashboard: "Client Portal",
      privacy: "Privacy & Security",
      rights: "All rights reserved.",
    };
  }
  return {
    badge: "Notification Officielle",
    secTitle: "Conseil sécurité",
    secNotice:
      "Azari Microfinance ne vous demandera jamais votre mot de passe, code secret PIN ou code OTP par téléphone, email ou SMS. Ne partagez jamais ces informations.",
    regulated: "Système Financier Décentralisé régi par la réglementation UMOA.",
    help: "Besoin d'aide ?",
    contact: "Contactez notre support à",
    dashboard: "Espace Client",
    privacy: "Sécurité & Confidentialité",
    rights: "Tous droits réservés.",
  };
}

function renderPreheader(previewText: string): string {
  return `<div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${escapeHtml(previewText)}
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>`;
}

function renderHeader(baseUrl: string, platformName: string, badgeText: string): string {
  return `<tr>
    <td class="header-padding" style="padding: 28px 24px 20px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="left" valign="middle">
            <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
              <img src="${baseUrl}/images/brand/azari-logo-full.png" width="148" height="42" alt="${escapeHtml(platformName)}" style="display: block; width: 148px; max-width: 148px; height: auto; border: 0; outline: none;" />
            </a>
          </td>
          <td align="right" valign="middle">
            <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #475569; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 9999px;">
              ${badgeText}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderCard(contentHtml: string, secTitle: string, secNotice: string): string {
  return `<tr>
    <td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);">
        <tr>
          <td class="card-content" style="padding: 36px 32px 32px 32px; color: #334155; font-size: 15px; line-height: 1.6;">
            ${contentHtml}
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="20" valign="top" style="padding-top: 2px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </td>
                  <td style="padding-left: 10px; font-size: 12px; line-height: 1.5; color: #64748b;">
                    <strong style="color: #475569;">${secTitle} :</strong> ${secNotice}
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderFooter(
  baseUrl: string,
  platformName: string,
  supportEmail: string,
  lbl: ReturnType<typeof getI18nLabels>,
): string {
  return `<tr>
    <td style="padding: 28px 16px 20px 16px; text-align: center; font-size: 12px; line-height: 1.6; color: #94a3b8;">
      <p style="margin: 0 0 8px 0; color: #64748b; font-weight: 500;">
        <a href="${baseUrl}/client/dashboard" target="_blank" style="color: #077bad; text-decoration: none; margin: 0 8px;">${lbl.dashboard}</a>
        &bull;
        <a href="${baseUrl}/privacy" target="_blank" style="color: #64748b; text-decoration: none; margin: 0 8px;">${lbl.privacy}</a>
        &bull;
        <a href="mailto:${supportEmail}" style="color: #64748b; text-decoration: none; margin: 0 8px;">Support</a>
      </p>
      <p style="margin: 0 0 4px 0;">
        ${lbl.help} ${lbl.contact} <a href="mailto:${supportEmail}" style="color: #077bad; text-decoration: underline;">${supportEmail}</a>
      </p>
      <p style="margin: 0 0 12px 0;">${escapeHtml(platformName)} &mdash; ${lbl.regulated}</p>
      <p style="margin: 0; font-size: 11px; color: #cbd5e1;">&copy; 2026 ${escapeHtml(platformName)}. ${lbl.rights}</p>
    </td>
  </tr>`;
}

export function wrapInEmailLayout(contentHtml: string, options: EmailLayoutOptions = {}): string {
  const trimmed = contentHtml.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.includes("<body")) {
    return contentHtml;
  }

  const lang = options.language === "en" ? "en" : "fr";
  const isEn = lang === "en";
  const platformName = options.platformName || "Azari Microfinance";
  const supportEmail = options.supportEmail || "support@azari-microfinance.site";
  const baseUrl = options.baseUrl || "https://azari-microfinance.site";
  const subject = options.subject || (isEn ? "Notification" : "Notification de compte");
  const previewText = options.previewText || subject;
  const labels = getI18nLabels(isEn);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .card-content { padding: 24px 20px !important; }
      .header-padding { padding: 20px 20px 16px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  ${renderPreheader(previewText)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; width: 100%;">
    <tr>
      <td align="center" style="padding: 24px 12px 40px 12px;">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto;">
          <tr><td style="height: 4px; background-color: #077bad; border-radius: 4px 4px 0 0; font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
          ${renderHeader(baseUrl, platformName, labels.badge)}
          ${renderCard(trimmed, labels.secTitle, labels.secNotice)}
          ${renderFooter(baseUrl, platformName, supportEmail, labels)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function sampleVariablesForTemplate(slug: string): Record<string, string> {
  const map: Record<string, Record<string, string>> = {
    kyc_completed: { client_firstname: "Fatou" },
    kyc_rejected: { client_firstname: "Fatou" },
    deposit_confirmed: { amount: "150 000" },
    withdrawal_completed: { amount: "150 000" },
    loan_requests_disbursed: { amount: "1 000 000" },
    loan_guarantee_required: {
      client_firstname: "Koffi",
      amount: "1 000 000",
      guarantee_amount: "100 000",
    },
    repayment_confirmed: { amount: "88 500" },
    installment_due_soon: { amount: "88 500", due_date: "15/11/2026" },
    installment_late: { amount: "88 500" },
    pin_reset_otp: { otp: "739 104" },
  };
  return map[slug] ?? { client_firstname: "Amadou", amount: "500 000", otp: "482 910" };
}

export function renderTemplatePreview(bodyHtml: string, slug: string): string {
  const samples = sampleVariablesForTemplate(slug);
  let rendered = bodyHtml;
  for (const [key, val] of Object.entries(samples)) {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(token, () => val);
  }
  return rendered;
}
