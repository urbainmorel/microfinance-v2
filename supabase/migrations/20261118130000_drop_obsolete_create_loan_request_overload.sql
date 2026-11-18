-- Migration : Suppression de la surcharge obsolète de create_loan_request
-- Date : 2026-11-18
--
-- La migration 20260917202000 a changé la signature de public.create_loan_request
-- (ajout de p_product en 2e position) via CREATE OR REPLACE, sans supprimer l'ancienne.
-- PostgreSQL a donc conservé deux surcharges :
--   * (uuid, uuid, bigint, integer, text, bigint, text, jsonb, uuid, uuid)  -- obsolète
--   * (uuid, uuid, uuid, bigint, integer, text, bigint, text, jsonb, uuid)  -- actuelle
--
-- L'ancienne reste exécutable par service_role et applique l'ancien workflow de prêt
-- (validation produit et gating garantie différents) : deux portes d'entrée pour une
-- opération financière, c'est une faille de cohérence. On ne garde qu'une seule porte.

drop function if exists public.create_loan_request(
  uuid, uuid, bigint, integer, text, bigint, text, jsonb, uuid, uuid
);
