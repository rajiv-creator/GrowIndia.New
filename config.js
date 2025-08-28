
// /config.js (PLAIN JS)
window.SUPABASE_URL = "https://ekgctaamlsrqipxpruqk.supabase.co";  // paste again using the copy button
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2N0YWFtbHNycWlweHBydXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjIwMTMsImV4cCI6MjA3MTkzODAxM30.3aqBQ-uS2P1budKMdOvpdZwLS9vXBFrJ8HQPnapw7gw";             // paste again using the copy button

// Create client (trim removes hidden spaces/newlines)
window.supabase = supabase.createClient(
  window.SUPABASE_URL.trim(),
  window.SUPABASE_ANON_KEY.trim(),
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
window.sbAuth = window.supabase.auth;

console.log("Supabase set:", {
  url: window.SUPABASE_URL,
  keyLen: window.SUPABASE_ANON_KEY.length
});
