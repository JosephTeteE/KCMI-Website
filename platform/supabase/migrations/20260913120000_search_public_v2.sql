-- Search V2: public-only Postgres search RPC.
-- SECURITY DEFINER so Hub-authenticated sessions cannot surface drafts via staff RLS.
-- Explicit publication filters on every source. No pastoral / giving private / auth tables.

create or replace function public.search_public_content(
  p_query text,
  p_type text default null,
  p_limit integer default 25
)
returns table (
  result_type text,
  title text,
  summary text,
  url text,
  context text,
  image_url text,
  rank_score double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text;
  v_limit integer;
  v_type text;
  v_tokens text[];
begin
  v_q := lower(trim(both from regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')));
  if char_length(v_q) > 80 then
    v_q := left(v_q, 80);
  end if;

  if v_q = '' then
    return;
  end if;

  v_tokens := array_remove(string_to_array(v_q, ' '), '');
  if coalesce(array_length(v_tokens, 1), 0) = 0 then
    return;
  end if;

  v_limit := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_type := nullif(lower(trim(both from coalesce(p_type, ''))), '');
  if v_type = 'all' then
    v_type := null;
  end if;
  if v_type is not null and v_type not in ('page', 'program', 'sermon', 'location') then
    return;
  end if;

  return query
  with tokens as (
    select unnest(v_tokens) as tok
  ),
  pages as (
    select *
    from (
      values
        (
          'page'::text,
          'About KCMI'::text,
          'Learn about Kingdom Covenant Ministries International, our vision, and leadership.'::text,
          '/about'::text,
          'Page'::text,
          null::text,
          'about kcmi kingdom covenant ministries international vision leadership apostle'::text
        ),
        (
          'page',
          'Apostle Philemon Frank Aikins',
          'Senior Pastor and Founder of Kingdom Covenant Ministries International.',
          '/about/apostle-frank-aikins',
          'Page',
          null,
          'apostle philemon frank aikins pastor founder leadership'
        ),
        (
          'page',
          'Services',
          'Worship times, cell fellowships, service teams, and ways to connect at KCMI.',
          '/services',
          'Page',
          null,
          'services worship cell fellowship teams prayer'
        ),
        (
          'page',
          'Sermons',
          'Watch KCMI sermons on YouTube and other verified media destinations.',
          '/sermons',
          'Page',
          null,
          'sermons messages media youtube watch listen'
        ),
        (
          'page',
          'FAQs',
          'Answers to common questions about visiting and connecting with KCMI.',
          '/faqs',
          'Page',
          null,
          'faqs frequently asked questions visit'
        ),
        (
          'page',
          'Contact',
          'Email or call the church office and find KCMI locations.',
          '/contact',
          'Page',
          null,
          'contact email phone connect office'
        ),
        (
          'page',
          'Giving',
          'Give to Kingdom Covenant Ministries International and support the work of the church.',
          '/giving',
          'Page',
          null,
          'giving tithe offering stewardship generosity'
        ),
        (
          'page',
          'Locations',
          'Find KCMI branches and locations across nations.',
          '/locations',
          'Page',
          null,
          'locations branches churches find visit'
        ),
        (
          'page',
          'Livestream',
          'Watch KCMI livestream when a service is live online.',
          '/livestream',
          'Page',
          null,
          'livestream live watch online service'
        )
    ) as t(result_type, title, summary, url, context, image_url, haystack)
  ),
  page_hits as (
    select
      p.result_type,
      p.title,
      p.summary,
      p.url,
      p.context,
      p.image_url,
      (
        case
          when (
            select bool_and(position(t.tok in lower(p.title)) > 0) from tokens t
          ) then 3.0
          else 0.0
        end
        + case
          when (
            select bool_and(position(t.tok in lower(p.haystack)) > 0) from tokens t
          ) then 1.0
          else 0.0
        end
        + case when position(v_q in lower(p.title)) > 0 then 0.5 else 0.0 end
      )::double precision as rank_score
    from pages p
    where (
      select bool_and(
        position(t.tok in lower(p.title || ' ' || p.haystack)) > 0
      )
      from tokens t
    )
  ),
  doc_hits as (
    select
      'page'::text as result_type,
      case d.document_key
        when 'about' then 'About KCMI'
        when 'services' then 'Services'
        when 'faqs' then 'FAQs'
        when 'sermons_page' then 'Sermons'
        else initcap(replace(d.document_key, '_', ' '))
      end as title,
      left(
        regexp_replace(
          coalesce(d.payload::text, ''),
          '[{}\[\]"]+',
          ' ',
          'g'
        ),
        220
      ) as summary,
      case d.document_key
        when 'about' then '/about'
        when 'services' then '/services'
        when 'faqs' then '/faqs'
        when 'sermons_page' then '/sermons'
        else '/'
      end as url,
      'Page'::text as context,
      null::text as image_url,
      (
        case
          when (
            select bool_and(
              position(
                t.tok in lower(
                  case d.document_key
                    when 'about' then 'about kcmi'
                    when 'services' then 'services'
                    when 'faqs' then 'faqs'
                    when 'sermons_page' then 'sermons'
                    else d.document_key
                  end
                )
              ) > 0
            )
            from tokens t
          ) then 3.0
          else 0.0
        end
        + case
          when (
            select bool_and(position(t.tok in lower(d.payload::text)) > 0)
            from tokens t
          ) then 1.0
          else 0.0
        end
      )::double precision as rank_score
    from public.website_documents d
    where d.status = 'published'
      and d.document_key in ('about', 'services', 'faqs', 'sermons_page')
      and (
        select bool_and(
          position(
            t.tok in lower(
              coalesce(d.payload::text, '') || ' ' || d.document_key
            )
          ) > 0
        )
        from tokens t
      )
  ),
  program_hits as (
    select
      'program'::text as result_type,
      p.title,
      nullif(trim(both from p.short_description), '') as summary,
      '/programs/' || p.slug as url,
      coalesce(
        (
          select case
            when min(ps.session_date) = max(ps.session_date) then
              to_char(min(ps.session_date)::timestamp, 'FMMonth FMDD, YYYY')
            else
              to_char(min(ps.session_date)::timestamp, 'FMMonth FMDD')
              || ' – '
              || to_char(max(ps.session_date)::timestamp, 'FMMonth FMDD, YYYY')
          end
          from public.program_sessions ps
          where ps.program_id = p.id
        ),
        case
          when p.starts_at is not null and p.ends_at is not null
            and (p.starts_at::date = p.ends_at::date) then
            to_char(p.starts_at at time zone 'UTC', 'FMMonth FMDD, YYYY')
          when p.starts_at is not null and p.ends_at is not null then
            to_char(p.starts_at at time zone 'UTC', 'FMMonth FMDD')
            || ' – '
            || to_char(p.ends_at at time zone 'UTC', 'FMMonth FMDD, YYYY')
          when p.starts_at is not null then
            to_char(p.starts_at at time zone 'UTC', 'FMMonth FMDD, YYYY')
          else 'Program'
        end
      ) as context,
      m.public_url as image_url,
      (
        case
          when (
            select bool_and(position(t.tok in lower(p.title)) > 0) from tokens t
          ) then 3.0
          else 0.0
        end
        + case
          when (
            select bool_and(
              position(
                t.tok in lower(
                  coalesce(p.short_description, '') || ' ' || coalesce(p.body_text, '')
                )
              ) > 0
            )
            from tokens t
          ) then 1.0
          else 0.0
        end
        + case when position(v_q in lower(p.title)) > 0 then 0.5 else 0.0 end
      )::double precision as rank_score
    from public.programs p
    left join public.media_assets m on m.id = p.featured_media_id
    where p.status = 'published'
      and p.archived_at is null
      and (
        select bool_and(
          position(
            t.tok in lower(
              p.title
              || ' '
              || coalesce(p.short_description, '')
              || ' '
              || coalesce(p.body_text, '')
            )
          ) > 0
        )
        from tokens t
      )
  ),
  sermon_hits as (
    select
      'sermon'::text as result_type,
      s.title,
      nullif(trim(both from coalesce(s.summary, '')), '') as summary,
      '/sermons#' || s.id::text as url,
      trim(
        both from concat_ws(
          ' · ',
          nullif(trim(both from coalesce(s.speaker, '')), ''),
          case
            when s.sermon_date is not null then
              to_char(s.sermon_date::timestamp, 'FMMonth FMDD, YYYY')
            else null
          end
        )
      ) as context,
      m.public_url as image_url,
      (
        case
          when (
            select bool_and(position(t.tok in lower(s.title)) > 0) from tokens t
          ) then 3.0
          else 0.0
        end
        + case
          when (
            select bool_and(
              position(
                t.tok in lower(
                  coalesce(s.speaker, '')
                  || ' '
                  || coalesce(s.summary, '')
                  || ' '
                  || coalesce(s.scripture_reference, '')
                )
              ) > 0
            )
            from tokens t
          ) then 1.0
          else 0.0
        end
        + case when position(v_q in lower(s.title)) > 0 then 0.5 else 0.0 end
      )::double precision as rank_score
    from public.sermons s
    left join public.media_assets m on m.id = s.thumbnail_media_id
    where s.status = 'published'
      and s.archived_at is null
      and (
        select bool_and(
          position(
            t.tok in lower(
              s.title
              || ' '
              || coalesce(s.speaker, '')
              || ' '
              || coalesce(s.summary, '')
              || ' '
              || coalesce(s.scripture_reference, '')
            )
          ) > 0
        )
        from tokens t
      )
  ),
  location_hits as (
    select
      'location'::text as result_type,
      b.name as title,
      case
        when nullif(trim(both from b.city_label), '') is null then
          nullif(trim(both from coalesce(b.country, '')), '')
        when nullif(trim(both from coalesce(b.country, '')), '') is null then
          trim(both from b.city_label)
        when lower(trim(both from b.city_label)) =
             lower(trim(both from b.country)) then
          trim(both from b.city_label)
        when lower(trim(both from b.city_label)) like
             '%,' || ' ' || lower(trim(both from b.country)) then
          trim(both from b.city_label)
        when lower(trim(both from b.city_label)) like
             '% ' || lower(trim(both from b.country)) then
          trim(both from b.city_label)
        else
          trim(both from b.city_label) || ' · ' || trim(both from b.country)
      end as summary,
      '/locations/' || b.slug as url,
      'Location'::text as context,
      null::text as image_url,
      (
        case
          when (
            select bool_and(position(t.tok in lower(b.name)) > 0) from tokens t
          ) then 3.0
          else 0.0
        end
        + case
          when (
            select bool_and(
              position(
                t.tok in lower(
                  coalesce(b.city_label, '')
                  || ' '
                  || coalesce(b.country, '')
                  || ' '
                  || coalesce(array_to_string(b.address_lines, ' '), '')
                )
              ) > 0
            )
            from tokens t
          ) then 1.0
          else 0.0
        end
        + case when position(v_q in lower(b.name)) > 0 then 0.5 else 0.0 end
      )::double precision as rank_score
    from public.church_branches b
    where b.is_public = true
      and b.status = 'published'
      and b.archived_at is null
      and (
        select bool_and(
          position(
            t.tok in lower(
              b.name
              || ' '
              || coalesce(b.city_label, '')
              || ' '
              || coalesce(b.country, '')
              || ' '
              || coalesce(array_to_string(b.address_lines, ' '), '')
              || ' '
              || coalesce(b.slug, '')
            )
          ) > 0
        )
        from tokens t
      )
  ),
  combined as (
    select * from page_hits
    union all
    select * from doc_hits
    union all
    select * from program_hits
    union all
    select * from sermon_hits
    union all
    select * from location_hits
  ),
  deduped as (
    select distinct on (c.result_type, c.url)
      c.result_type,
      c.title,
      c.summary,
      c.url,
      nullif(trim(both from coalesce(c.context, '')), '') as context,
      c.image_url,
      c.rank_score
    from combined c
    where c.rank_score > 0
      and (v_type is null or c.result_type = v_type)
    order by c.result_type, c.url, c.rank_score desc
  )
  select
    d.result_type,
    d.title,
    d.summary,
    d.url,
    d.context,
    d.image_url,
    d.rank_score
  from deduped d
  order by d.rank_score desc, d.title asc
  limit v_limit;
end;
$$;

comment on function public.search_public_content(text, text, integer) is
  'Search V2 public corpus only: published pages/programs/sermons and public branches. Never drafts, Hub, pastoral, or private financial records.';

revoke all on function public.search_public_content(text, text, integer) from public;
grant execute on function public.search_public_content(text, text, integer)
  to anon, authenticated, service_role;
