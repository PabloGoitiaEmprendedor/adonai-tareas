-- Add email notifications toggle to settings
ALTER TABLE public.settings ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true;
