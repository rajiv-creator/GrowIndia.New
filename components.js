/* GrowIndia Jobs — shared helpers + header (plain JS, no build) */
(function () {
  "use strict";

  // ---- Supabase handles from config.js ----
  const sb = window.supabase;
  const sbAuth = window.sbAuth;

  // ---- Theme ----
  function setThemeFromStorage() {
    try {
      const t = localStorage.getItem("theme");
      if (t === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch (_) {}
  }
  async function toggleTheme() {
    try {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (_) {}
  }

  // ---- Session helpers ----
  async function getSession() {
    const { data, error } = await sbAuth.getSession();
    if (error) return null;
    return data?.session || null;
  }

  // Redirect to /index.html if not logged in
  async function requireAuth() {
    const s = await getSession();
    if (!s) {
      location.href = "/index.html";
      return null;
    }
    return s;
  }

  // ---- Admin check (via table) ----
  async function isAdmin() {
    const s = await getSession();
    if (!s) return false;
    // Simple check against admins table
    const { data, error } = await sb
      .from("admins")
      .select("user_id")
      .eq("user_id", s.user.id)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  // ---- Header ----
  // Renders into <header id="site-header"></header> if present, else inserts at top of body.
  async function header() {
    setThemeFromStorage();

    let mount = document.getElementById("site-header");
    if (!mount) {
      mount = document.createElement("header");
      mount.id = "site-header";
      document.body.prepend(mount);
    }

    // Build static shell
    mount.innerHTML = [
      '<div class="container header">',
      '  <a class="brand" href="/index.html">GrowIndia Jobs</a>',
      '  <nav class="nav" id="gi-nav"></nav>',
      "</div>",
    ].join("");

    const nav = mount.querySelector("#gi-nav");

    // Base links
    const jobsLink = `<a class="btn ghost" href="/jobs.html">Jobs</a>`;
    const employerLink = `<a class="btn ghost" href="/employer.html">Employer</a>`;

    // Theme toggle button
    const themeBtn = `<button id="gi-theme" class="btn ghost" title="Toggle theme">🌓</button>`;

    // Auth-aware bits
    const s = await getSession();
    let authBtn = `<a class="btn primary" href="/index.html">Login</a>`;
    let adminLink = "";

    if (s?.user?.id) {
      // Show Logout
      authBtn = `<button id="gi-logout" class="btn">Logout</button>`;

      // If admin, show Admin
      if (await isAdmin()) {
        adminLink = `<a class="btn ghost" href="/admin.html">Admin</a>`;
      }
    }

    nav.innerHTML = [jobsLink, employerLink, adminLink, themeBtn, authBtn]
      .filter(Boolean)
      .join("");

    // Wire up actions
    const logoutBtn = nav.querySelector("#gi-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          await sbAuth.signOut();
        } catch (_) {}
        location.href = "/index.html";
      });
    }
    const themeToggle = nav.querySelector("#gi-theme");
    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
  }

  // Re-render header on auth state changes (keeps Login/Logout in sync)
  try {
    sbAuth.onAuthStateChange(() => {
      header();
    });
  } catch (_) {}

  // Initial render ASAP
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", header);
  } else {
    header();
  }

  // ---- Expose helpers for pages ----
  window.setThemeFromStorage = setThemeFromStorage;
  window.toggleTheme = toggleTheme;
  window.getSession = getSession;
  window.requireAuth = requireAuth;
  window.isAdmin = isAdmin;
  window.header = header;
})();
