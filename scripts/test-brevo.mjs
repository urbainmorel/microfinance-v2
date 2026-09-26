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
      <div style="font-family: sans-serif; padding: 20px; color: #111;">
        <h2 style="color: #0b4f3f;">Azari Microfinance — Test Brevo</h2>
        <p>Ceci est un email de test confirmant que l'intégration Brevo fonctionne avec succès.</p>
        <p>Horodatage : ${new Date().toISOString()}</p>
      </div>
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
