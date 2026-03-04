# Supabase Setup for Auth & Cloud Storage

1. **Create project** at [supabase.com](https://supabase.com) → New Project
2. **Auth → Providers**: Enable Email. For Google: add Client ID and Secret from [Google Cloud Console](https://console.cloud.google.com/) (OAuth 2.0 credentials)
3. **SQL Editor**: Run the contents of `supabase/migrations/001_user_data.sql`
4. **Settings → API**: Copy Project URL and anon/public key
5. Create `app/.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
