-- Optional livestream auto-end (read-time effective live; no cron).
-- Hub stores Nigeria-local end converted to UTC timestamptz.

alter table public.livestream_settings
  add column if not exists auto_end_at timestamptz;

comment on column public.livestream_settings.auto_end_at is
  'Optional UTC instant after which public visitors treat the stream as offline even if is_live remains true. Entered in Hub as Africa/Lagos local time. Null = no automatic end. Manual Off still clears is_live immediately.';
