
/** GrowIndia Jobs - shared helpers */
const sb = window.supabase;
const sbAuth = window.sbAuth;

function setThemeFromStorage(){
  try{ const t = localStorage.getItem("theme"); if(t==="dark") document.documentElement.classList.add("dark"); }catch(_){}
}
setThemeFromStorage();

function toggleTheme(){
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

async function getSession(){
  const { data } = await sbAuth.getSession();
  return data.session;
}

async function requireAuth(){
  const s = await getSession();
  if(!s){ location.href="/index.html"; return null; }
  return s;
}

async function isAdmin(){
  const s = await getSession();
  if(!s) return false;
  const { data, error } = await sb.from("admins").select("user_id").eq("user_id", s.user.id).maybeSingle();
  if(error) return false;
  return !!data;
}

function header(user, admin=false){
  const left = `<a class="brand" href="/jobs.html">GrowIndia Jobs</a>`;
  const right = `
    <div class="nav">
      <a class="btn ghost" href="/jobs.html">Jobs</a>
      ${user?`<a class="btn ghost" href="/employer.html">Employer</a>`:""}
      ${admin?`<a class="btn ghost" href="/admin.html">Admin</a>`:""}
      <button class="btn" id="themeBtn" type="button">🌓</button>
      ${user?`<button class="btn" id="logoutBtn" type="button">Logout</button>`:`<a class="btn primary" href="/index.html">Login</a>`}
    </div>`;
  const el = document.createElement("header");
  el.className = "header";
  el.innerHTML = `<div class="header-inner">${left}${right}</div>`;
  document.body.prepend(el);
  document.getElementById("themeBtn").addEventListener("click", toggleTheme);
  const lo = document.getElementById("logoutBtn"); if(lo) lo.addEventListener("click", async ()=>{ await sbAuth.signOut(); location.href="/index.html"; });
}

function qs(name){ const u=new URL(location.href); return u.searchParams.get(name); }
function timeAgo(iso){ if(!iso) return ""; const d=(Date.now()-new Date(iso))/1000;
  const u=[["y",31536000],["mo",2592000],["d",86400],["h",3600],["m",60]];
  for(const [l,s] of u){ if(d>=s) return Math.floor(d/s)+l; } return Math.max(1,Math.floor(d))+"s"; }
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#39;" }[m])); }

window.GI = { getSession, requireAuth, isAdmin, header, qs, timeAgo, escapeHtml };
