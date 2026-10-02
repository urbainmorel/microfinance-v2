import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import process from "node:process";
process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const adminToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "qdmriiokeindzgeokvqj";

async function runTest() {
  console.log("=== TEST DE VALIDATION DU CLIENT ANONYME SUR LE SYSTÈME DE SUPPORT ===");

  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquant !");
  }

  // 1. Initialiser le client Supabase en mode strictement ANONYME (aucun utilisateur connecté)
  const anonSupabase = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  const testSessionId = `test_anon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  console.log(`\n1. Tentative d'insertion d'une conversation par un visiteur anonyme...`);
  console.log(`Session ID de test : ${testSessionId}`);

  // Test 1: Insert conversation avec .select('id, status').single()
  const { data: convData, error: convError } = await anonSupabase
    .from("support_conversations")
    .insert({
      user_id: null,
      session_id: testSessionId,
      status: "bot",
    })
    .select("id, status")
    .single();

  if (convError) {
    console.error("❌ ÉCHEC de l'insertion conversation :", convError);
    throw new Error(`Échec insertion support_conversations: ${convError.message}`);
  }

  console.log("✓ Succès insertion support_conversations avec RETURNING SELECT !");
  console.log("Données retournées :", convData);

  const convId = convData.id;

  // Test 2: Sélection de la conversation par le client anonyme
  console.log(`\n2. Vérification du SELECT direct de la conversation par le visiteur anonyme...`);
  const { data: selectConv, error: selectConvErr } = await anonSupabase
    .from("support_conversations")
    .select("id, session_id, status, created_at")
    .eq("id", convId)
    .single();

  if (selectConvErr) {
    console.error("❌ ÉCHEC de la lecture conversation :", selectConvErr);
    throw selectConvErr;
  }
  console.log("✓ Succès lecture conversation :", selectConv);

  // Test 3: Mise à jour (UPDATE) de la conversation par le client anonyme
  console.log(`\n3. Vérification de l'UPDATE de last_message_at par le visiteur anonyme...`);
  const nowIso = new Date().toISOString();
  const { error: updateConvErr } = await anonSupabase
    .from("support_conversations")
    .update({ last_message_at: nowIso })
    .eq("id", convId);

  if (updateConvErr) {
    console.error("❌ ÉCHEC de la mise à jour conversation :", updateConvErr);
    throw updateConvErr;
  }
  console.log("✓ Succès mise à jour conversation !");

  // Test 4: Insertion d'un message utilisateur dans support_messages
  console.log(
    `\n4. Tentative d'insertion d'un message dans support_messages par le visiteur anonyme...`,
  );
  const { data: msgData, error: msgError } = await anonSupabase
    .from("support_messages")
    .insert({
      conversation_id: convId,
      sender_type: "user",
      sender_name: "Visiteur Test",
      content: "Bonjour, je teste l'accès anonyme au chatbot !",
    })
    .select("id, conversation_id, sender_type, content")
    .single();

  if (msgError) {
    console.error("❌ ÉCHEC de l'insertion message :", msgError);
    throw msgError;
  }
  console.log("✓ Succès insertion message utilisateur :", msgData);

  // Test 5: Lecture de l'historique des messages pour cette conversation par le client anonyme
  console.log(
    `\n5. Vérification de la lecture de l'historique des messages par le visiteur anonyme...`,
  );
  const { data: history, error: historyErr } = await anonSupabase
    .from("support_messages")
    .select("id, sender_type, content, created_at")
    .eq("conversation_id", convId);

  if (historyErr) {
    console.error("❌ ÉCHEC de la lecture de l'historique des messages :", historyErr);
    throw historyErr;
  }
  console.log(`✓ Succès lecture historique (${history.length} messages trouvés) :`, history);

  // Test 6: Nettoyage (suppression de la ligne de test via l'API Supabase Admin)
  console.log(`\n6. Nettoyage de la conversation de test (ID: ${convId})...`);
  const delRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `DELETE FROM public.support_conversations WHERE id = '${convId}';`,
    }),
  });
  if (!delRes.ok) {
    console.warn("Avertissement nettoyage :", await delRes.text());
  } else {
    console.log("✓ Nettoyage de la conversation et des messages en cascade effectué avec succès !");
  }

  console.log("\n=======================================================");
  console.log("🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS (0 ERREURS) !");
  console.log("=======================================================");
}

runTest().catch((err) => {
  console.error("Échec des tests :", err);
  process.exit(1);
});
