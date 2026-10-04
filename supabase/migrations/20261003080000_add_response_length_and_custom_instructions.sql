-- Migration : Ajout de la longueur de réponse personnalisable et des consignes spécifiques
-- Date : 2026-10-03

-- 1. Ajout des colonnes response_length et custom_instructions à public.chatbot_settings
ALTER TABLE public.chatbot_settings 
  ADD COLUMN IF NOT EXISTS response_length TEXT NOT NULL DEFAULT 'balanced' 
  CHECK (response_length IN ('concise', 'balanced', 'detailed')),
  ADD COLUMN IF NOT EXISTS custom_instructions TEXT DEFAULT NULL;

-- 2. Mise à jour de la fonction RPC update_chatbot_settings
CREATE OR REPLACE FUNCTION public.update_chatbot_settings(p_values JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
BEGIN
  IF NOT (public.auth_role() = 'admin') THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs.';
  END IF;

  SELECT to_jsonb(s) INTO v_old FROM public.chatbot_settings s WHERE id FOR UPDATE;

  UPDATE public.chatbot_settings SET
    bot_name = COALESCE(p_values->>'botName', p_values->>'bot_name', bot_name),
    bot_avatar_url = COALESCE(p_values->>'botAvatarUrl', p_values->>'bot_avatar_url', bot_avatar_url),
    primary_color = COALESCE(p_values->>'primaryColor', p_values->>'primary_color', primary_color),
    model_name = COALESCE(p_values->>'modelName', p_values->>'model_name', model_name),
    welcome_message = COALESCE(p_values->>'welcomeMessage', p_values->>'welcome_message', welcome_message),
    offline_message = COALESCE(p_values->>'offlineMessage', p_values->>'offline_message', offline_message),
    suggested_questions = CASE 
      WHEN p_values ? 'suggestedQuestions' THEN p_values->'suggestedQuestions'
      WHEN p_values ? 'suggested_questions' THEN p_values->'suggested_questions'
      ELSE suggested_questions 
    END,
    ai_tone = COALESCE(p_values->>'aiTone', p_values->>'ai_tone', ai_tone),
    response_length = COALESCE(p_values->>'responseLength', p_values->>'response_length', response_length),
    custom_instructions = CASE
      WHEN p_values ? 'customInstructions' THEN NULLIF(TRIM(p_values->>'customInstructions'), '')
      WHEN p_values ? 'custom_instructions' THEN NULLIF(TRIM(p_values->>'custom_instructions'), '')
      ELSE custom_instructions
    END,
    financial_disclaimer = COALESCE(p_values->>'financialDisclaimer', p_values->>'financial_disclaimer', financial_disclaimer),
    is_agent_online = COALESCE((p_values->>'isAgentOnline')::BOOLEAN, (p_values->>'is_agent_online')::BOOLEAN, is_agent_online),
    business_hours_start = COALESCE((p_values->>'businessHoursStart')::TIME, (p_values->>'business_hours_start')::TIME, business_hours_start),
    business_hours_end = COALESCE((p_values->>'businessHoursEnd')::TIME, (p_values->>'business_hours_end')::TIME, business_hours_end),
    business_days = CASE
      WHEN p_values ? 'businessDays' THEN ARRAY(SELECT jsonb_array_elements_text(p_values->'businessDays')::INT)
      WHEN p_values ? 'business_days' THEN ARRAY(SELECT jsonb_array_elements_text(p_values->'business_days')::INT)
      ELSE business_days
    END,
    updated_at = NOW()
  WHERE id;

  SELECT to_jsonb(s) INTO v_new FROM public.chatbot_settings s WHERE id;

  -- Enregistrement strict conforme aux colonnes réelles de public.audit_logs
  INSERT INTO public.audit_logs (
    user_id,
    user_role,
    action_type,
    target_id,
    old_value,
    new_value,
    reason
  ) VALUES (
    auth.uid(),
    'admin',
    'CHATBOT_SETTINGS_UPDATED',
    NULL,
    v_old,
    v_new,
    'Mise à jour des paramètres du chatbot et du support'
  );
END;
$$;
