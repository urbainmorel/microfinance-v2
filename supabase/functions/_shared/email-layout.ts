/**
 * Gabarit de courriel unifié pour Azari Microfinance (Deno / Supabase Edge Functions).
 * Rendu sobre, moderne, raffiné et compatible tous clients mails.
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

export function wrapInEmailLayout(contentHtml: string, options: EmailLayoutOptions = {}): string {
  const trimmed = contentHtml.trim();
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<body")
  ) {
    return contentHtml;
  }

  const lang = options.language === "en" ? "en" : "fr";
  const isEn = lang === "en";
  const platformName = options.platformName || "Azari Microfinance";
  const supportEmail = options.supportEmail || "support@azari-microfinance.site";
  const baseUrl = options.baseUrl || "https://azari-microfinance.site";
  const subject = options.subject || (isEn ? "Notification" : "Notification de compte");
  const previewText = options.previewText || subject;

  const badgeText = isEn ? "Official Notification" : "Notification Officielle";
  const securityTitle = isEn ? "Security reminder" : "Conseil sécurité";
  const securityNotice = isEn
    ? "Azari Microfinance will never ask you for your password, PIN code or OTP code by phone, email or SMS. Keep your credentials private."
    : "Azari Microfinance ne vous demandera jamais votre mot de passe, code secret PIN ou code OTP par téléphone, email ou SMS. Ne partagez jamais ces informations.";

  const footerRegulated = isEn
    ? "Regulated Microfinance Institution (UMOA)."
    : "Système Financier Décentralisé régi par la réglementation UMOA.";
  const footerHelp = isEn ? "Need assistance?" : "Besoin d'aide ?";
  const footerContact = isEn ? "Contact our support at" : "Contactez notre support à";
  const footerDashboard = isEn ? "Client Portal" : "Espace Client";
  const footerPrivacy = isEn ? "Privacy & Security" : "Sécurité & Confidentialité";
  const footerRights = isEn ? "All rights reserved." : "Tous droits réservés.";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    a {
      color: #077bad;
      text-decoration: none;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .card-content {
        padding: 24px 20px !important;
      }
      .header-padding {
        padding: 20px 20px 16px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${escapeHtml(previewText)}
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; width: 100%;">
    <tr>
      <td align="center" style="padding: 24px 12px 40px 12px;">
        <!--[if (gte mso 9)|(IE)]>
        <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0">
        <tr>
        <td>
        <![endif]-->
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto;">
          <tr>
            <td style="height: 4px; background-color: #077bad; border-radius: 4px 4px 0 0; font-size: 1px; line-height: 1px;">&nbsp;</td>
          </tr>

          <tr>
            <td class="header-padding" style="padding: 28px 24px 20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle">
                            <img src="${baseUrl}/images/brand/azari-logo-full.png" width="148" height="42" alt="${escapeHtml(platformName)}" style="display: block; width: 148px; max-width: 148px; height: auto; border: 0; outline: none;" />
                          </td>
                        </tr>
                      </table>
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
          </tr>

          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);">
                <tr>
                  <td class="card-content" style="padding: 36px 32px 32px 32px; color: #334155; font-size: 15px; line-height: 1.6;">
                    ${trimmed}

                    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="20" valign="top" style="padding-top: 2px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                          </td>
                          <td style="padding-left: 10px; font-size: 12px; line-height: 1.5; color: #64748b;">
                            <strong style="color: #475569;">${securityTitle} :</strong> ${securityNotice}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 16px 20px 16px; text-align: center; font-size: 12px; line-height: 1.6; color: #94a3b8;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-weight: 500;">
                <a href="${baseUrl}/client/dashboard" target="_blank" style="color: #077bad; text-decoration: none; margin: 0 8px;">${footerDashboard}</a>
                &bull;
                <a href="${baseUrl}/privacy" target="_blank" style="color: #64748b; text-decoration: none; margin: 0 8px;">${footerPrivacy}</a>
                &bull;
                <a href="mailto:${supportEmail}" style="color: #64748b; text-decoration: none; margin: 0 8px;">Support</a>
              </p>
              <p style="margin: 0 0 4px 0;">
                ${footerHelp} ${footerContact} <a href="mailto:${supportEmail}" style="color: #077bad; text-decoration: underline;">${supportEmail}</a>
              </p>
              <p style="margin: 0 0 12px 0;">
                ${escapeHtml(platformName)} &mdash; ${footerRegulated}
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; 2026 ${escapeHtml(platformName)}. ${footerRights}
              </p>
            </td>
          </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
