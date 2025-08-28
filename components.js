/** GrowIndia Jobs — shared helpers */
const sb = window.supabase;
const sbAuth = window.sbAuth;

/* ---------- Theme ---------- */
function setThemeFromStorage(){
  try {
    const t = localStorage.getItem("theme");
    if (t === "dark") document.documentElement.classList.add("dark");
  } catch (_) {}
}
setThemeFromStorage();

function toggleTheme(){
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

/* ---------- Session helpers ---------- */
async function getSession(){
  const { data } = await sbAuth.getSession();
  return data?.session || null;
}

async function requireAuth(){
  const s = await getSession();
  if (!s) { location.href = "/index.html"; return null; }
  return s;
}

async function isAdmin(){
  const s = await getSession();
  if (!s) return false;
  const { data, error } = await sb
    .from("admins")
    .select("user_id")
    .eq("user_id", s.user.id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/* ---------- Header ---------- */
function header(user, admin = false){
  const left = `<a class="brand" href="/jobs.html">GrowIndia Jobs</a>`;
  const right = `
    <div class="nav">
      <a class="btn ghost" href="/jobs.html">Jobs</a>
      ${user ? `<a class="btn" href="/employer.html">Employer</a>` : ""}
      ${admin ? `<a class="btn ghost" href="/admin.html">Admin</a>` : ""}
      <button class="btn" id="themeBtn" type="button">🌓</button>
      ${
        user
          ? `<button class="btn" id="logoutBtn" type="button">Logout</button>`
          : `<a class="btn primary" href="/index.html">Login</a>`
      }
    </div>
  `;

  const el = document.createElement("header");
  el.className = "header";
  el.innerHTML = `<div class="container row" style="justify-content:space-between">${left}${right}</div>`;
  document.body.prepend(el);

  // wire up buttons
  el.querySelector("#themeBtn")?.addEventListener("click", toggleTheme);
  el.querySelector("#logoutBtn")?.addEventListener("click", async () => {
    await sbAuth.signOut(); location.href = "/index.html";
  });
}

/* ---------- Utilities ---------- */
function escapeHtml(s=""){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function timeAgo(iso){
  const d = new Date(iso); const n = Date.now();
  const sec = Math.max(1, Math.round((n - d.getTime())/1000));
  const units = [[31536000,"y"],[2592000,"mo"],[604800,"w"],[86400,"d"],[3600,"h"],[60,"m"],[1,"s"]];
  for (const [s,u] of units) if (sec >= s) return Math.floor(sec/s) + u;
  return "now";
}

function qs(key){ return new URLSearchParams(location.search).get(key); }

/* expose */
window.GI = { getSession, requireAuth, isAdmin, header, escapeHtml, timeAgo, qs };
