/**
 * Runtime configuration for the Meridian MUN site.
 *
 * 1. Copy this file to `config.js` (same folder as index.html).
 * 2. Fill in your Supabase project URL and PUBLISHABLE (anon) key below.
 * 3. Do NOT commit config.js — it's listed in .gitignore.
 *
 * The anon/publishable key is safe to expose in client-side code; it is
 * restricted entirely by the Row Level Security policies defined in
 * schema.sql. Never put your Supabase service_role key here or anywhere
 * in frontend code.
 */
window.__SUPABASE_CONFIG__ = {
  url: "https://YOUR-PROJECT-REF.supabase.co",
  anonKey: "YOUR-SUPABASE-PUBLISHABLE-ANON-KEY",
};
