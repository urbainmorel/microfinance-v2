-- Nettoyage des mentions "pilote V1" dans les descriptions des produits de prêt
alter table public.loan_products disable trigger trg_guard_loan_product_history;

update public.loan_products
set description = replace(replace(description, ' du pilote V1.', '.'), ' dans le pilote V1.', '.')
where description like '%pilote V1%';

alter table public.loan_products enable trigger trg_guard_loan_product_history;
