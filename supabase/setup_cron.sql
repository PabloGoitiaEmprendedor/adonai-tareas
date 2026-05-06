-- Habilitar las extensiones necesarias
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Esto activa el reporte automático cada domingo a las 9 AM
select cron.schedule(
  'weekly-power-report',
  '0 9 * * 0',
  $$
  select net.http_post(
    url:='https://bpckgibqjrqdxzbvtiyn.supabase.co/functions/v1/weekly-power-report',
    headers:='{
      "Content-Type": "application/json", 
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY2tnaWJxanJxZHh6YnZ0aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ5MzI1MCwiZXhwIjoyMDkzMDY5MjUwfQ.CxLGxwUwXs2CDFKWauaBgSpWaq85aj1C0SVxfUE8knk"
    }'::jsonb
  )
  $$
);
