// config.js  (PLAIN JS)
// 🔒 Paste YOUR values between the quotes below (use the copy buttons in Supabase)
// Do not add spaces/newlines around them.

window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

// Create the client — must be done AFTER the CDN script is loaded
window.supabase = supabase.createClient(
  window.SUPABASE_URL.trim(),
  window.SUPABASE_ANON_KEY.trim(),
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

// Handy alias used by the pages
window.sbAuth = window.supabase.auth;

// One-time sanity log (you should see this on every page)
console.log("Supabase set:", {
  url: window.SUPABASE_URL,
  keylen: window.SUPABASE_ANON_KEY.length
});
