-- Phase D1 reproducible seed of VERIFIED public content.
-- Does NOT invent resolutions for CONTENT_VERIFICATION_GAPS.md conflicts.
-- Giving destinations intentionally omitted (remain code-controlled until D2).

-- Livestream: page share URL only; is_live false (no verified video URL)
insert into public.livestream_settings (singleton_key, facebook_url, is_live)
values (
  'default',
  'https://www.facebook.com/share/18bfxXA9Sj/?mibextid=LQQJ4d',
  false
)
on conflict (singleton_key) do update set
  facebook_url = excluded.facebook_url,
  is_live = excluded.is_live,
  updated_at = now();

-- Branches (stable UUIDs for reproducible references / tests)
insert into public.church_branches (
  id, slug, name, city_label, address_lines,
  phone_display, phone_tel, phones, email, maps_query, maps_url,
  phone_evidence_note, is_public, status, sort_order, published_at
) values
(
  'a1000000-0000-4000-8000-000000000001',
  'headquarters',
  'Headquarters',
  'Port Harcourt, Nigeria',
  array[
    'Okuruola Wonodi Close',
    'Off Stadium Road, Port Harcourt',
    'Rivers State, Nigeria',
    'P.O Box 2595, Diobu'
  ],
  '+234 9134 44 8322',
  '+2349134448322',
  '[]'::jsonb,
  null,
  'KINGDOM COVENANT MINISTRIES INTERNATIONAL, Okuruola Wonodi Close, Port Harcourt',
  'https://www.google.com/maps/search/?api=1&query=KINGDOM+COVENANT+MINISTRIES+INTERNATIONAL+Rumuola+Port+Harcourt',
  null,
  true,
  'published',
  10,
  now()
),
(
  'a1000000-0000-4000-8000-000000000002',
  'rumuigbo',
  'Rumuigbo Branch',
  'Rivers State, Nigeria',
  array[
    'Iboloji Multipurpose Hall',
    '19, Egeonu Street',
    'Off Iboloji Street, Rumuigbo',
    'Rivers State, Nigeria'
  ],
  '+234 8036 96 3420',
  '+2348036963420',
  '[]'::jsonb,
  null,
  'Iboloji Multipurpose Hall, 19 Egeonu Street, Rumuigbo, Rivers State, Nigeria',
  null,
  null,
  true,
  'published',
  20,
  now()
),
(
  'a1000000-0000-4000-8000-000000000003',
  'abia',
  'Abia State',
  'Umuahia, Nigeria',
  array[
    'Off National Museum Road',
    'By Nipost Office',
    'Umuagu, Umuahia',
    'Abia State, Nigeria'
  ],
  '+234 8052 78 0054',
  '+2348052780054',
  '[]'::jsonb,
  null,
  'Umuagu, Umuahia, Abia State, Nigeria Nipost',
  null,
  null,
  true,
  'published',
  30,
  now()
),
(
  'a1000000-0000-4000-8000-000000000004',
  'togo',
  'Togo',
  'Lomé, Togo',
  array[
    'Route Attiegou Cedeao Pres De La Creche',
    'Les Savoir',
    'Lome, Togo'
  ],
  '+228 94 43 38 85',
  '+2289443385',
  '[]'::jsonb,
  null,
  'Route Attiegou Cedeao, Lome, Togo',
  null,
  'Legacy location.html shows tel/display +2289443385 but data-phone +22897817263. Display/tel value used pending EXTERNAL VERIFICATION.',
  true,
  'published',
  40,
  now()
),
(
  'a1000000-0000-4000-8000-000000000005',
  'accra',
  'Accra',
  'Accra, Ghana',
  array[
    'No.6 Mensah Kommy Lane, near 2nd Bus Station',
    'Opetekwe/Ebenezer Down, Dansoman Last Stop',
    'Accra, Ghana'
  ],
  '+233 543 340 415',
  '+233543340415',
  '[]'::jsonb,
  'charamcy@gmail.com',
  'Mensah Kommy Lane, Dansoman, Accra, Ghana',
  null,
  'Legacy display string used atypical spacing (+23 3543…); tel/data-phone +233543340415 used for dialing.',
  true,
  'published',
  50,
  now()
),
(
  'a1000000-0000-4000-8000-000000000006',
  'kasoa',
  'Kasoa',
  'Kasoa, Ghana',
  array[
    'Behind Bennet Clinic',
    'CP Last Stop Kasoa',
    'Kasoa, Ghana'
  ],
  '+233 555 582 826',
  '+233555582826',
  '[]'::jsonb,
  null,
  'Bennet Clinic, Kasoa, Ghana',
  null,
  null,
  true,
  'published',
  60,
  now()
),
(
  'a1000000-0000-4000-8000-000000000007',
  'cape-coast',
  'Cape Coast',
  'Cape Coast, Ghana',
  array[
    'UCC - Campus Fellowship',
    'School of Business Guest House, Conference Room',
    'UCC, Cape Coast, Ghana'
  ],
  '+233 247 463 818',
  '+233247463818',
  '[
    {"display":"+233 247 463 818","tel":"+233247463818"},
    {"display":"+233 541 418 841","tel":"+233541418841"},
    {"display":"+233 553 146 404","tel":"+233553146404"}
  ]'::jsonb,
  'ucckcmi@gmail.com',
  'University of Cape Coast School of Business Guest House',
  null,
  null,
  true,
  'published',
  70,
  now()
)
on conflict (slug) do update set
  name = excluded.name,
  city_label = excluded.city_label,
  address_lines = excluded.address_lines,
  phone_display = excluded.phone_display,
  phone_tel = excluded.phone_tel,
  phones = excluded.phones,
  email = excluded.email,
  maps_query = excluded.maps_query,
  maps_url = excluded.maps_url,
  phone_evidence_note = excluded.phone_evidence_note,
  sort_order = excluded.sort_order,
  status = excluded.status,
  is_public = excluded.is_public,
  updated_at = now();

-- Clear and re-seed service times (idempotent)
delete from public.branch_service_times
where branch_id in (
  select id from public.church_branches where slug in (
    'headquarters','rumuigbo','abia','togo','accra','kasoa','cape-coast'
  )
);

insert into public.branch_service_times (branch_id, day_label, time_label, sort_order) values
  ('a1000000-0000-4000-8000-000000000001', 'Sunday', '08:30 am', 1),
  ('a1000000-0000-4000-8000-000000000001', 'Thursday', '05:30 pm', 2),
  ('a1000000-0000-4000-8000-000000000002', 'Sunday', '08:30 am', 1),
  ('a1000000-0000-4000-8000-000000000002', 'Wednesday', '05:30 pm', 2),
  ('a1000000-0000-4000-8000-000000000003', 'Sunday', '08:30 am', 1),
  ('a1000000-0000-4000-8000-000000000003', 'Thursday', '06:00 pm', 2),
  ('a1000000-0000-4000-8000-000000000004', 'Sunday', '08:00 am', 1),
  ('a1000000-0000-4000-8000-000000000004', 'Tuesday', '06:00 pm', 2),
  ('a1000000-0000-4000-8000-000000000004', 'Thursday', '06:00 pm', 3),
  ('a1000000-0000-4000-8000-000000000005', 'Sunday', '08:30 am', 1),
  ('a1000000-0000-4000-8000-000000000005', 'Thursday', '06:00 pm', 2),
  -- Kasoa intentionally has ZERO service times (CONTENT_VERIFICATION_GAPS)
  ('a1000000-0000-4000-8000-000000000007', 'Sunday', '01:00 pm', 1),
  ('a1000000-0000-4000-8000-000000000007', 'Friday', '06:00 pm', 2);

-- No published programs by default (homepage empty-state remains honest).
-- No invented sermon catalog rows (legacy had platforms only).
