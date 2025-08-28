// components.js
// Tiny shared helpers used across pages.

const sb = window.supabase;
const sbAuth = window.sbAuth;

// ------- Theme -------
function setThemeFromStorage() {
  try {
    const t = localStorage.getItem("theme");
    if (t === "dark") document.documentElement.classList.add("dark");
  } catch (_) {}
}
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}
setThemeFromStorage();

// ------- Session helpers -------
async function getSession() {
  const { data } = await sbAuth.getSession();
  return data?.session || null;
}
async function requireAuth() {
  const s = await getSession();
  if (!s) {
    location.href = "/index.html";
    return null;
  }
  return s;
}
async function isAdmin() {
  const s = await getSession();
  if (!s) return false;
  const { data, error } = await sb.from("admins").select("user_id").eq("user_id", s.user.id).maybeSingle();
  if (error) {
    console.warn("admin check error:", error.message);
    return false;
  }
  return !!data;
}

// ------- Header -------
async function mountHeader() {
  const s = await getSession();
  const user = s?.user;

  const el = document.createElement("header");
  el.className = "header";
  el.innerHTML = `
    <div class="nav">
      <a class="brand" href="/jobs.html">GrowIndia Jobs</a>
      <nav class="nav">
        <a class="btn ghost" href="/jobs.html">Jobs</a>
        <a class="btn ghost" href="/employer.html">Employer</a>
        <a class="btn ghost" href="/admin.html">Admin</a>
        <button id="themebtn" class="btn" type="button">🌓</button>
        ${user
          ? `<button id="logoutbtn" class="btn primary" type="button">Logout</button>`
          : `<a class="btn primary" href="/index.html">Login</a>`}
      </nav>
    </div>`;
  document.body.prepend(el);

  document.getElementById("themebtn")?.addEventListener("click", toggleTheme);
  document.getElementById("logoutbtn")?.addEventListener("click", async () => {
    await sbAuth.signOut();
    location.href = "/index.html";
  });
}
document.addEventListener("DOMContentLoaded", mountHeader);

// Expose minimal helpers
window.GI = { getSession, requireAuth, isAdmin };
