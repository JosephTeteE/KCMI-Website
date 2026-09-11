-- D1.7: replace known original website_documents home seed strings only when
-- the stored value still exactly matches that seed. Do not overwrite other values.
-- Apply locally first. Do not apply to production from this pass.

update public.website_documents
set payload = jsonb_set(
  payload,
  '{heroHeadline}',
  to_jsonb('Raising Kings To Build The Kingdom'::text),
  false
)
where document_key = 'home'
  and payload->>'heroHeadline' = 'Kingdom Covenant Ministries International';

update public.website_documents
set payload = jsonb_set(
  payload,
  '{heroPrimaryCtaLabel}',
  to_jsonb('Plan a Visit'::text),
  false
)
where document_key = 'home'
  and payload->>'heroPrimaryCtaLabel' = 'Plan a visit';

update public.website_documents
set payload = jsonb_set(
  payload,
  '{welcomeEyebrow}',
  to_jsonb('Discover KCMI'::text),
  false
)
where document_key = 'home'
  and payload->>'welcomeEyebrow' = 'Welcome';

update public.website_documents
set payload = jsonb_set(
  payload,
  '{welcomeHeading}',
  to_jsonb('Welcome to Kingdom Covenant Ministries International'::text),
  false
)
where document_key = 'home'
  and payload->>'welcomeHeading' = 'Raising Kings To Build The Kingdom';
