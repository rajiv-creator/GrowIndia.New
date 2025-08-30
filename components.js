// components.js v17 — shared app/db/ui helpers
(function(){
  if(!window.supabase){ console.error('Supabase client not found. Ensure /config.js sets window.supabase.'); }
  const sb = window.supabase;
  const app = window.app || (window.app = {});
  const ui  = window.ui  || (window.ui  = {});
  const db  = window.db  || (window.db  = {});

  // UI
  ui.toast = function(msg, type='info'){
    let wrap = document.getElementById('toasts');
    if(!wrap){ wrap = document.createElement('div'); wrap.id='toasts'; wrap.style.cssText='position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;z-index:9999'; document.body.appendChild(wrap); }
    const n = document.createElement('div');
    n.textContent = msg; n.style.cssText = 'background:#fff;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 6px 18px rgba(2,6,23,.1);padding:10px 12px;min-width:200px';
    if(type==='error'){ n.style.borderColor = '#ef4444' }
    if(type==='success'){ n.style.borderColor = '#22c55e' }
    wrap.appendChild(n); setTimeout(()=>{ n.remove(); }, 3500);
  };

  // App
  app.go = (url)=>{ window.location.href = url; };
  app.getSessionUser = async function(){ const { data, error } = await sb.auth.getUser(); if(error) throw error; return data.user; };
  app.requireAuth = async function(opts={}){
    const { data } = await sb.auth.getSession();
    if(!data.session){ window.location.href = (opts.redirectTo || '/login.html'); return Promise.reject(new Error('Auth required')); }
    return true;
  };
  app.getProfile = async function(user_id){ return await sb.from('profiles').select('*').eq('user_id', user_id).maybeSingle(); };
  app.upsertProfile = async function(payload){ return await sb.from('profiles').upsert(payload, { onConflict: 'user_id' }).select().maybeSingle(); };
  app.isAdmin = async function(){ return false; }; // placeholder

  // DB
  db.getSiteCopy = async function(key){ return await sb.from('site_copy').select('*').eq('key', key).maybeSingle(); };
  db.updateSiteCopy = async function(key, content){ return await sb.from('site_copy').upsert({ key, content, updated_at: new Date().toISOString() }, { onConflict:'key' }).select().maybeSingle(); };

  db.featuredJobs = async function(){
    return await sb.from('jobs')
      .select('id,title,company,location,employment_type,salary_min,salary_max,created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(12);
  };

  db.searchJobs = async function({ q='', loc='', type='all', page=1, pageSize=12 }){
    let query = sb.from('jobs')
      .select('id,title,company,location,employment_type,salary_min,salary_max,created_at', { count: 'exact' })
      .eq('published', true);

    const term = q.trim();
    if(term){
      const like = `%${term}%`;
      query = query.or(`title.ilike.${like},description.ilike.${like},company.ilike.${like}`);
    }
    if(loc && loc.trim()){ query = query.ilike('location', `%${loc.trim()}%`); }
    if(type && type !== 'all'){ query = query.eq('employment_type', type); }

    query = query.order('created_at', { ascending: false });
    const from = (page-1) * pageSize, to = from + pageSize - 1;
    return await query.range(from, to);
  };
})();
