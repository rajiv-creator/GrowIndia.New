// config.js  (PLAIN JS)
// 🔒 Paste YOUR values between the quotes below (use the copy buttons in Supabase)
// Do not add spaces/newlines around them.

window.SUPABASE_URL = "https://ekgctaamlsrqipxpruqk.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2N0YWFtbHNycWlweHBydXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjIwMTMsImV4cCI6MjA3MTkzODAxM30.3aqBQ-uS2P1budKMdOvpdZwLS9vXBFrJ8HQPnapw7gw";
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
