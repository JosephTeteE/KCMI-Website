-- D1.6F: replace known original website_documents seed strings only when the
-- stored value still exactly matches that seed. Do not overwrite other values.
-- Apply locally first. Do not apply to hosted staging from this pass.

update public.website_documents
set payload = jsonb_set(
  payload,
  '{headline}',
  to_jsonb('KCMI sermons and Rehoboth Wells'::text),
  false
)
where document_key = 'sermons_page'
  and payload->>'headline' = 'Experience the Word of God Anytime, Anywhere.';

update public.website_documents
set payload = jsonb_set(
  payload,
  '{sub}',
  to_jsonb('Watch messages from Apostle Philemon Frank Aikins and KCMI gatherings on YouTube, Silverbird, and TikTok. Join us in person at a church location.'::text),
  false
)
where document_key = 'sermons_page'
  and payload->>'sub' = 'Stay spiritually nourished with sermons from our church, available on multiple platforms.';

update public.website_documents
set payload = jsonb_set(
  payload,
  '{sectionTitle}',
  to_jsonb('Where to watch and listen'::text),
  false
)
where document_key = 'sermons_page'
  and payload->>'sectionTitle' = 'Where to Watch & Listen';

update public.website_documents
set payload = jsonb_set(
  payload,
  '{careBody}',
  to_jsonb('Prayer, counselling, welfare and celebration requests are available through the forms below.'::text),
  false
)
where document_key = 'services'
  and payload->>'careBody' in (
    'Prayer, counselling, welfare, and celebration requests currently use the ministry’s existing Google Forms. Those forms are not the future Pastoral Hub.',
    'Prayer, counselling, welfare, and celebration requests currently use the ministry''s existing Google Forms. Those forms are not the future Pastoral Hub.'
  );
