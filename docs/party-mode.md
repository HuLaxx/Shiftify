# Party Mode Setup (Vercel + Supabase)

## Supabase
1. Create a Supabase project.
2. Enable Anonymous sign-ins in Auth settings.
3. Run `docs/party-mode.sql` in the SQL editor.
4. In Database > Replication, enable Realtime for `party_rooms` and `party_messages`.

## Environment Variables
Add these to `.env.local` and Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Notes
- Party Mode uses anonymous auth for room ownership and chat identity.
- Realtime updates power room sync and chat.
- Co-DJ handoff uses the `co_dj_ids` column; re-run the SQL if you created tables before this was added.
