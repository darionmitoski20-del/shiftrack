# ShiftTracks

Work hours, daily approvals, pay totals and project chat for construction companies.
Next.js (installable PWA) + Supabase. UI is in English.

## What works in this first version

| Who | Screen | What it does |
| --- | --- | --- |
| Owner | Sign up → Set up company | Creates the company; the owner becomes its admin |
| Manager / owner | Team | Invite workers, foremen (owner also managers) by email; set hourly rate and pay period per person |
| Manager / owner | Projects | Create projects (name, address, client, work days) and assign people |
| Worker / foreman | Today | Log start, end, break and note for a project; see the week's total |
| Worker / foreman | My hours | Week by week: status, manager comments, overtime; request a correction on a rejected day |
| Manager / owner | Approvals | Approve / reject (with comment) each day, accept correction requests, see who hasn't logged today, filter by project |
| Manager / owner | Export | CSV (opens in Excel) of approved hours for the month, with overtime (>40 h/week) and pay = hours × rate |

Not built yet (next steps): project chat screens, push notifications and reminders,
weekly schedule, day-off requests, incidents, equipment, site diary, documents, PDF export, GPS.
The chat table (`messages`) and its security rules are already in the database.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run `supabase/migrations/20261106000000_init.sql`.
3. In **Authentication → URL configuration**, set the Site URL to where the app runs (e.g. `http://localhost:3000`).
4. In **Authentication → Email templates**, change the links so they come back to the app:
   - Invite user: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
5. Copy `.env.example` to `.env.local` and fill in the values from **Project settings → API**.
6. `npm install` and `npm run dev`, then open http://localhost:3000 and create your company.

## Security

Every table has row level security: people only see their own company, workers only see
their own hours, only managers approve, and only the owner changes roles. The service role key
is used only on the server, for inviting people from the Team page.
