begin;
delete from public.loan_products;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data)
values ('55555555-5555-5555-5555-555555555555', 'single-loan@test.dev', '{"firstname":"Loan","lastname":"Test"}');
insert into public.loan_products (
  id, name, min_amount, max_amount, min_duration_months, max_duration_months,
  interest_rate, interest_method
) values (
  '55555555-0000-0000-0000-000000000001', 'Test prêt unique',
  100000, 500000, 6, 12, 1, 'CONSTANT_INSTALLMENT'
);
insert into public.loan_requests (
  id, client_id, product_id, amount, duration_months, requested_disbursement_method, status
) values (
  '55555555-0000-0000-0000-000000000002',
  '55555555-5555-5555-5555-555555555555',
  '55555555-0000-0000-0000-000000000001', 100000, 6, 'INTERNAL', 'DISBURSED'
);
insert into public.loans (
  id, request_id, client_id, total_amount, remaining_principal,
  interest_rate, interest_method, start_date, end_date, status
) values (
  '55555555-0000-0000-0000-000000000003',
  '55555555-0000-0000-0000-000000000002',
  '55555555-5555-5555-5555-555555555555', 100000, 100000,
  1, 'CONSTANT_INSTALLMENT', current_date, current_date + 180, 'ACTIVE'
);

select throws_ok(
  $$ insert into public.loan_requests (
       client_id, product_id, amount, duration_months, requested_disbursement_method, status
     ) values (
       '55555555-5555-5555-5555-555555555555',
       '55555555-0000-0000-0000-000000000001', 100000, 6, 'INTERNAL', 'SUBMITTED'
     ) $$,
  'P0001', 'ACTIVE_LOAN_EXISTS',
  'une nouvelle demande est interdite avec un prêt vivant'
);

update public.loans set status = 'CLOSED', remaining_principal = 0
where id = '55555555-0000-0000-0000-000000000003';
select lives_ok(
  $$ insert into public.loan_requests (
       id, client_id, product_id, amount, duration_months, requested_disbursement_method, status
     ) values (
       '55555555-0000-0000-0000-000000000004',
       '55555555-5555-5555-5555-555555555555',
       '55555555-0000-0000-0000-000000000001', 120000, 6, 'INTERNAL', 'SUBMITTED'
     ) $$,
  'une nouvelle demande est acceptée après clôture'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '55555555-5555-5555-5555-555555555555', 'role', 'authenticated')::text,
  true
);
select is(
  public.get_active_loan_status() ->> 'displayState',
  '2',
  'la demande récente prime sur l’ancien prêt clôturé'
);

reset role;
select * from finish();
rollback;
