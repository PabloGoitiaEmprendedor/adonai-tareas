-- Required Supabase extensions.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store these values once in Supabase Vault before scheduling jobs:
-- select vault.create_secret('https://YOUR_PROJECT.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'anon_key');

select cron.schedule(
  'weekly-power-report',
  '0 9 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/weekly-power-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    )
  )
  $$
);

-- Run task and event reminders every minute.
select cron.unschedule(jobid)
from cron.job
where jobname = 'task-reminders';

select cron.schedule(
  'task-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/task-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    )
  )
  $$
);
