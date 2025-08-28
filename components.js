
/** GrowIndia Jobs - shared helpers (no build) */
const sb = window.supabase;
const sbAuth = window.sbAuth;

/* -------------- Theme -------------- */
function setThemeFromStorage(){
  try{
    const t = localStorage.getItem("theme");
    if(t==="dark") document.documentElement.classList.add("dark");
  }catch(_){}
}
setThemeFromStorage();

function toggleTheme(){
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

/* -------------- Session helpers -------------- */
async function getSession(){
  const { data } = await sbAuth.getSession();
  return data.session || null;
}

/** Redirect to /index.html if not logged in */
async function requireAuth(){
  const s = await getSession();
  if(!s){ location.href="/index.html"; return null; }
  return s;
}

/** simple admin check: true if row exists in admins */
async function isAdmin(){
  const s = await getSession();
  if(!s) return false;
  const { data, error } = await sb.from("admins").select("user_id").eq("user_id", s.user.id).maybeSingle();
  if(error){ return false; } // non-admin will hit RLS and get error; treat as false
  return !!data;
}

/* -------------- Header component -------------- */
function header(user, admin=false){
  const left = `<a class="brand" href="/jobs.html">GrowIndia Jobs</a>`;
  const right = `
    <div class="nav">
      <a class="btn ghost" href="/jobs.html">Jobs</a>
      ${user ? `<a class="btn ghost" href="/employer.html">Employer</a>`: ""}
      ${admin ? `<a class="btn ghost" href="/admin.html">Admin</a>`: ""}
      <button class="btn" id="themebtn" type="button">🌓</button>
      ${user ? `<button class="btn" id="logoutBtn" type="button">Logout</button>` : `<a class="btn primary" href="/index.html">Login</a>`}
    </div>`;

  const el = document.createElement("header");
  el.className = "header";
  el.innerHTML = `<nav>${left}${right}</nav>`;
  document.body.prepend(el);

  const themeBtn = document.getElementById("themebtn");
  if(themeBtn) themeBtn.onclick = toggleTheme;

  const lb = document.getElementById("logoutBtn");
  if(lb){
    lb.onclick = async()=>{
      await sbAuth.signOut();
      location.href="/index.html";
    };
  }
}

/* -------------- tiny helpers -------------- */
function htm(strings,...vals){
  return strings.reduce((acc,str,i)=>acc+str+(i<vals.length?(vals[i]??""):""),"");
}
function qs(s,root=document){ return root.querySelector(s); }
function qsa(s,root=document){ return Array.from(root.querySelectorAll(s)); }
function spinnerRow(text="Loading..."){ return `<tr><td colspan="99" class="muted">${text}</td></tr>`; }
function fmtDate(s){ return new Date(s).toLocaleString(); }
