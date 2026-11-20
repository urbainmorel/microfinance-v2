import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

process.loadEnvFile(".env.local");

const MANAGEMENT_API = "https://api.supabase.com/v1";
const PROJECT_REF_FILE = path.join("supabase", ".temp", "project-ref");

const TEMPLATES = [
  {
    name: "confirmation",
    subject: "Confirmez votre compte - Azari Microfinance",
    file: "supabase/templates/confirmation.html",
    requiredMarkers: ["/auth/confirm?token_hash={{ .TokenHash }}", "type=signup"],
    forbiddenMarkers: ["{{ .ConfirmationURL }}"],
  },
  {
    name: "recovery",
    subject: "Réinitialisation de votre mot de passe - Azari Microfinance",
    file: "supabase/templates/recovery.html",
    requiredMarkers: ["{{ .ConfirmationURL }}"],
    forbiddenMarkers: [],
  },
  {
    name: "magic_link",
    subject: "Connexion instantanée - Azari Microfinance",
    file: "supabase/templates/magic_link.html",
    requiredMarkers: ["{{ .ConfirmationURL }}"],
    forbiddenMarkers: [],
  },
  {
    name: "email_change",
    subject: "Confirmation de changement d'email - Azari Microfinance",
    file: "supabase/templates/email_change.html",
    requiredMarkers: ["{{ .ConfirmationURL }}"],
    forbiddenMarkers: [],
  },
  {
    name: "invite",
    subject: "Invitation à rejoindre Azari Microfinance",
    file: "supabase/templates/invite.html",
    requiredMarkers: ["{{ .ConfirmationURL }}"],
    forbiddenMarkers: [],
  },
];

async function projectRef() {
  const fromEnvironment = process.env.SUPABASE_PROJECT_REF?.trim();
  if (fromEnvironment) return fromEnvironment;
  return (await readFile(PROJECT_REF_FILE, "utf8")).trim();
}

async function managementRequest(endpoint, token, init) {
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Supabase Management API ${response.status} ${response.statusText}: ${body.slice(0, 500)}`,
    );
  }

  return response;
}

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("SUPABASE_ACCESS_TOKEN est absent de .env.local.");
  }

  const ref = await projectRef();
  const payload = {};

  for (const template of TEMPLATES) {
    const content = await readFile(template.file, "utf8");
    for (const marker of template.requiredMarkers) {
      if (!content.includes(marker)) {
        throw new Error(`${template.file} ne contient pas ${marker}.`);
      }
    }
    for (const marker of template.forbiddenMarkers) {
      if (content.includes(marker)) {
        throw new Error(`${template.file} contient encore ${marker}.`);
      }
    }
    payload[`mailer_subjects_${template.name}`] = template.subject;
    payload[`mailer_templates_${template.name}_content`] = content;
  }

  const endpoint = `${MANAGEMENT_API}/projects/${encodeURIComponent(ref)}/config/auth`;
  await managementRequest(endpoint, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  const remoteResponse = await managementRequest(endpoint, token);
  const remote = await remoteResponse.json();

  for (const template of TEMPLATES) {
    const remoteContent = remote[`mailer_templates_${template.name}_content`];
    if (remoteContent !== payload[`mailer_templates_${template.name}_content`]) {
      throw new Error(`Le modèle ${template.name} n'a pas été appliqué.`);
    }
    if (remote[`mailer_subjects_${template.name}`] !== template.subject) {
      throw new Error(`Le sujet ${template.name} n'a pas été appliqué.`);
    }
  }

  console.log(
    `Modèles Auth appliqués et vérifiés sur ${ref}: ${TEMPLATES.map((template) => template.name).join(", ")}.`,
  );
}

run().catch((error) => {
  console.error(
    `Application des modèles Auth interrompue : ${
      error instanceof Error ? error.message : "erreur inconnue"
    }`,
  );
  process.exitCode = 1;
});
