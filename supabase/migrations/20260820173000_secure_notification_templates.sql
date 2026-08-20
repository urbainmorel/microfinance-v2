create or replace function public.save_notification_template(
  p_slug text, p_language text, p_subject text, p_body_html text, p_variables jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_variable text; v_placeholder text;
begin
  perform app_private.require_active_staff(array['admin']);
  if p_slug !~ '^[a-z][a-z0-9_]{2,63}$' or p_language not in ('fr', 'en')
    or length(trim(p_subject)) not between 1 and 160 or length(p_body_html) not between 1 and 20000
    or jsonb_typeof(p_variables) <> 'array' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if p_body_html ~* '<script|on[a-z]+\s*=|javascript:|data:text/html' then
    raise exception using errcode = '22023', message = 'UNSAFE_TEMPLATE_HTML';
  end if;
  for v_variable in select jsonb_array_elements_text(p_variables) loop
    if v_variable !~ '^[a-z][a-z0-9_]{0,63}$' then
      raise exception using errcode = '22023', message = 'INVALID_TEMPLATE_VARIABLE';
    end if;
  end loop;
  for v_placeholder in select matches[1] from regexp_matches(
    p_subject || ' ' || p_body_html, '\{\{([a-zA-Z0-9_]+)\}\}', 'g'
  ) as matches loop
    if not p_variables ? v_placeholder then
      raise exception using errcode = '22023', message = 'UNDECLARED_TEMPLATE_VARIABLE', detail = v_placeholder;
    end if;
  end loop;
  insert into public.notification_templates (
    slug, language, subject, body_html, variables, updated_by, updated_at
  ) values (trim(p_slug), p_language, trim(p_subject), p_body_html, p_variables, auth.uid(), now())
  on conflict (slug, language) do update set subject = excluded.subject,
    body_html = excluded.body_html, variables = excluded.variables,
    updated_by = excluded.updated_by, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.save_notification_template(text, text, text, text, jsonb) from public, anon;
grant execute on function public.save_notification_template(text, text, text, text, jsonb) to authenticated;

insert into public.notification_templates (slug, language, subject, body_html, variables)
values
  ('kyc_completed', 'en', 'Your KYC file has been approved', '<p>Hello {{client_firstname}}, your KYC file has been approved.</p>', '["client_firstname"]'),
  ('kyc_rejected', 'en', 'Your KYC file needs attention', '<p>Hello {{client_firstname}}, your KYC file was rejected. Please review your account.</p>', '["client_firstname"]'),
  ('deposit_confirmed', 'en', 'Deposit confirmed', '<p>Your deposit of XOF {{amount}} has been confirmed.</p>', '["amount"]'),
  ('deposit_rejected', 'en', 'Deposit rejected', '<p>Your deposit request has been rejected.</p>', '[]'),
  ('withdrawal_completed', 'en', 'Withdrawal completed', '<p>Your withdrawal of XOF {{amount}} has been completed.</p>', '["amount"]'),
  ('withdrawal_rejected', 'en', 'Withdrawal rejected', '<p>Your withdrawal request has been rejected.</p>', '[]'),
  ('loan_requests_accepted', 'en', 'Your loan has been accepted', '<p>Your loan request has been accepted. Please review and sign your contract.</p>', '[]'),
  ('loan_requests_disbursed', 'en', 'Your loan has been disbursed', '<p>Your loan of XOF {{amount}} has been disbursed.</p>', '["amount"]'),
  ('repayment_confirmed', 'en', 'Repayment confirmed', '<p>Your repayment of XOF {{amount}} has been confirmed.</p>', '["amount"]'),
  ('loans_closed', 'en', 'Your loan is complete', '<p>Your loan is complete and your blocked funds have been released.</p>', '[]'),
  ('installment_due_soon', 'en', 'Loan installment due in 3 days', '<p>An installment of XOF {{amount}} is due on {{due_date}}.</p>', '["amount","due_date"]'),
  ('installment_late', 'en', 'Loan installment overdue', '<p>An installment of XOF {{amount}} is overdue.</p>', '["amount"]'),
  ('pin_reset_otp', 'en', 'Your PIN reset code', '<p>Your reset code is {{otp}}. It expires in 10 minutes.</p>', '["otp"]')
on conflict (slug, language) do nothing;
