
// config.sample.js
// Copy to config.js and paste your Supabase URL and Anon key.
window.SUPABASE_URL = "https://YOUR-REF.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Create client
window.supabase = supabase.createClient(
  window.SUPABASE_URL.trim(),
  window.SUPABASE_ANON_KEY.trim(),
  { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }
);
window.sbAuth = window.supabase.auth;

// quick sanity log (optional)
console.log("Supabase set:", { url: window.SUPABASE_URL, keylen: window.SUPABASE_ANON_KEY.length });
