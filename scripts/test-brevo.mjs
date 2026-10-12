import process from "node:process";

// Charger les variables d'environnement locales
try {
  process.loadEnvFile(".env.local");
} catch {
  // Ignorer si déjà chargé
}

const brevoApiKey = process.env.BREVO_API_KEY;
const emailFrom =
  process.env.EMAIL_FROM || "Azari Microfinance <notifications@azari-microfinance.site>";

if (!brevoApiKey) {
  console.error("❌ ERREUR: BREVO_API_KEY est manquante dans .env.local");
  process.exit(1);
}

function parseSender(senderString) {
  const match = senderString.match(/^(?:(?:"?([^"]*)"?\s)?<([^>]+)>|([^<>\s]+))$/);
  if (match) {
    const name = match[1]?.trim();
    const email = (match[2] ?? match[3])?.trim();
    if (email) {
      return name ? { email, name } : { email };
    }
  }
  return { email: senderString.trim() };
}

async function checkAccount() {
  console.log("🔍 Test de connexion à l'API Brevo...");
  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: {
        "api-key": brevoApiKey,
        Accept: "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`❌ Échec de la requête Brevo (HTTP ${res.status}):`);
      console.error(JSON.stringify(data, null, 2));

      if (data.code === "unauthorized" && data.message?.includes("authorised_ips")) {
        console.warn("\n⚠️ ATTENTION - RESTRICTION D'ADRESSE IP DÉTECTÉE SUR BREVO :");
        console.warn("Votre compte Brevo a activé le filtrage par adresse IP.");
        console.warn("Pour autoriser les requêtes, rendez-vous sur :");
        console.warn("👉 https://app.brevo.com/security/authorised_ips");
        console.warn(
          "Vous devez y ajouter votre IP ou désactiver la liste blanche pour les Edge Functions.",
        );
      }
      return false;
    }

    console.log("✅ Authentification Brevo réussie !");
    console.log(`   - Email du compte: ${data.email}`);
    console.log(`   - Nom de l'entreprise: ${data.companyName}`);
    console.log(`   - Plan: ${data.plan?.[0]?.type || "N/A"}`);
    console.log(`   - Crédits d'emails restants: ${data.plan?.[0]?.credits ?? "Illimité/Inconnu"}`);

    // Lister les expéditeurs validés
    const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
      headers: {
        "api-key": brevoApiKey,
        Accept: "application/json",
      },
    });

    if (sendersRes.ok) {
      const sendersData = await sendersRes.json();
      console.log("\n📧 Expéditeurs configurés sur le compte Brevo :");
      sendersData.senders?.forEach((s) => {
        console.log(`   - [${s.active ? "ACTIF" : "INACTIF"}] ${s.name} <${s.email}>`);
      });
    }

    return true;
  } catch (err) {
    console.error("❌ Erreur réseau:", err.message);
    return false;
  }
}

async function sendTestEmail(targetEmail) {
  const sender = parseSender(emailFrom);
  console.log(`\n📨 Envoi d'un email de test à ${targetEmail} depuis ${sender.email}...`);

  const payload = {
    sender,
    to: [{ email: targetEmail }],
    subject: "Test Brevo — Azari Microfinance",
    htmlContent: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Test Brevo — Azari Microfinance</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;width:100%;">
    <tr>
      <td align="center" style="padding:24px 12px 40px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin:0 auto;">
          <tr>
            <td style="height:4px;background-color:#077bad;border-radius:4px 4px 0 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 24px 20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <img src="https://azari-microfinance.site/images/brand/azari-logo-full.png" width="148" height="42" alt="Azari Microfinance" style="display:block;width:148px;height:auto;border:0;" />
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 10px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#475569;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:9999px;">Test d'intégration</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(15,23,42,0.04);">
                <tr>
                  <td style="padding:36px 32px 32px 32px;color:#334155;font-size:15px;line-height:1.6;">
                    <div style="margin-bottom:24px;">
                      <span style="display:inline-block;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;border-radius:9999px;background-color:#ecfdf5;color:#047857;border:1px solid #a7f3d0;">Passerelle opérationnelle</span>
                    </div>
                    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Validation de l'intégration Brevo</h1>
                    <p style="margin:0 0 16px;color:#334155;">Cet email confirme avec succès le bon fonctionnement de la liaison entre l'infrastructure d'envoi transactionnel Brevo et la plateforme Azari Microfinance.</p>
                    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;">
                        <tr>
                          <td style="color:#64748b;padding-bottom:6px;">Statut SMTP :</td>
                          <td style="color:#047857;font-weight:700;text-align:right;padding-bottom:6px;">Connecté & Validé</td>
                        </tr>
                        <tr>
                          <td style="color:#64748b;">Horodatage :</td>
                          <td style="color:#0f172a;font-family:monospace;text-align:right;">${new Date().toISOString()}</td>
                        </tr>
                      </table>
                    </div>
                    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;line-height:1.5;">
                      <strong style="color:#475569;">Conseil sécurité :</strong> Azari Microfinance ne vous demandera jamais vos identifiants ou codes secrets par email.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 16px 20px 16px;text-align:center;font-size:12px;line-height:1.6;color:#94a3b8;">
              <p style="margin:0 0 4px 0;">Azari Microfinance &mdash; Système Financier Décentralisé régi par la réglementation UMOA.</p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">&copy; 2026 Azari Microfinance. Tous droits réservés.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error(`❌ Échec de l'envoi de l'email (HTTP ${res.status}):`);
      console.error(JSON.stringify(result, null, 2));
      return false;
    }

    console.log("✅ Email de test envoyé avec succès !");
    console.log(`   - Message ID: ${result.messageId}`);
    return true;
  } catch (err) {
    console.error("❌ Erreur lors de l'envoi:", err.message);
    return false;
  }
}

async function main() {
  const ok = await checkAccount();
  const testRecipient = process.argv[2];
  if (ok && testRecipient && testRecipient.includes("@")) {
    await sendTestEmail(testRecipient);
  } else if (ok) {
    console.log("\n💡 Astuce : Vous pouvez envoyer un email de test réel en exécutant :");
    console.log("   node scripts/test-brevo.mjs votre-email@example.com");
  }
}

main();
