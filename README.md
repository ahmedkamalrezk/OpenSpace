# OpenSpace

A private idea studio for two collaborators. The interface uses the [Glisse](https://glisse.kelvinzhang.com/) React glass component for its refraction lens, with a restrained set of layered translucent surfaces around it. The local preview is useful for exploring the flows; connect Supabase before storing real private content.

## Run locally

1. Install Node.js 22.12 or newer.
2. Run `npm install` and `npm run dev`.
3. Without Supabase keys, the app opens a local preview. Its sample ideas and any edits stay in this browser's local storage and are not private from someone with access to this device.

## Connect Supabase

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Older projects may use `VITE_SUPABASE_ANON_KEY`. These public client keys are intended for browser use; never put a secret or service role key in this app.
3. Apply `supabase/migrations/202611040001_idea_space.sql` in the Supabase SQL editor or with the Supabase CLI.
4. Create the owner's account in Supabase Auth, replace `OWNER_EMAIL_HERE` in `supabase/bootstrap-owner.sql`, and run that script once in the SQL editor. This provisions the only initial workspace owner without allowing the first public signup to claim the workspace.
5. Enable email/password authentication and configure confirmation and password recovery URLs for your local and deployed origins. Account creation inside the app is available only from an invitation URL.
6. Sign in as the owner and create a seven-day invitation link in **Settings**. The collaborator signs in or creates an account through that link.
7. Add the deployed domain to Supabase Auth's allowed redirect URLs before deployment.

The migration keeps private ideas and resources behind PostgreSQL RLS, checks shared access for discussions and votes, hashes invitation tokens, accepts invitations transactionally under a workspace lock, and enforces the two-member cap in the same transaction. Realtime is enabled for the workspace tables and remains subject to RLS. No service role key is used in the frontend.

## Modules in this MVP

- Email/password sign in, account creation, and password recovery.
- Two-person workspace bootstrap and single-use invitation acceptance.
- Private/shared ideas, searchable idea board, categories, statuses, discussion replies, and one upvote per member.
- Atomic next-project selection, project notes, dates, repository and demo links.
- Private/shared resource library with per-user favorites.
- Visibility-filtered activity, theme switching, responsive layouts, and Supabase Realtime refreshes.

## Security verification before launch

Use two separate Supabase Auth accounts. Confirm that the owner cannot select the collaborator's private idea/resource by direct table queries or by UUID; then change a shared item to private and repeat the checks for its comments, votes, activity, search results, and realtime events. Also verify invitation expiry/reuse/revocation and attempt to accept two invitations concurrently. These checks require a configured Supabase project and real test accounts; they have not been run in this workspace.

Set Supabase Auth's email and invitation rate limits in the project settings before launch. The SQL invitation RPC also limits invitation creation to five links per hour per owner.

The local preview is a presentation and interaction fallback only. It does not enforce RLS, sync across accounts, or create real invitations.
