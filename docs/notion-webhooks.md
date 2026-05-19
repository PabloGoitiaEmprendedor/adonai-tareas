# Notion Webhooks

Public webhook endpoint:

`https://bpckgibqjrqdxzbvtiyn.supabase.co/functions/v1/notion-webhook`

Current state:
- `supabase/functions/notion-webhook` is deployed as a public Supabase Edge Function.
- `NOTION_WEBHOOK_ENABLED=true` must be set in Supabase secrets.
- `public.notion_webhook_events` stores raw Notion events and verification payloads.
- The webhook validates signed events when a verification token is available.

Register in Notion:
1. Open the Notion integration dashboard.
2. Go to the integration webhook/event subscription settings.
3. Add the public webhook endpoint above.
4. Select page/database update events needed for task sync.
5. Complete Notion's verification flow.

Follow-up processing:
- Resolve page-to-task mapping from `notion_page_tasks`.
- Re-read the changed page from Notion after webhook delivery.
- Push updates to the app through the normal task queries and realtime refresh.
