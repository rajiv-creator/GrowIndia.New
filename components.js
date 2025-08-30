<script>
/* components.js v20 */
;(function () {
  const client = window.supabase; // from /config.js

  const log = (...a)=>console.log('[app]',...a);

  window.ui = {
    toast(msg, type='info'){
      try{
        const el=document.createElement('div');
        el.textContent=msg;
        el.style.cssText='position:fixed;right:16px;bottom:16px;background:#111;color:#fff;padding:10px 12px;border-radius:10px;z-index:9999;opacity:.95';
        if(type==='error') el.style.background='#b91c1c';
        if(type==='success') el.style.background='#166534';
        document.body.appendChild(el); setTimeout(()=>el.remove(),3500);
      }catch(e){ alert(msg) }
    }
  };

  window.app = {
    async requireAuth({redirectTo='/login.html'}={}){
      const { data: { session } } = await client.auth.getSession();
      if(!session){ location.href = redirectTo; return; }
      return session;
    },
    async getSessionUser(){
      const { data: { user } } = await client.auth.getUser();
      return user;
    },
    async getProfile(user_id){
      return client.from('profiles').select('*').eq('user_id', user_id).maybeSingle();
    },
    async upsertProfile(payload){
      // guarantee role
      if(!payload.role) payload.role = 'candidate';
      return client.from('profiles').upsert(payload, { onConflict: 'user_id' });
    }
  };

  // ---- DB helpers ----
  async function selectJobs(cols){
    return client.from('jobs').select(cols).eq('published', true).order('created_at', { ascending:false });
  }

  window.db = {
    async featuredJobs(limit=12){
      // try with company; fallback without if column missing
      let q = await selectJobs('id,title,location,employment_type,salary_min,salary_max,company').limit(limit);
      if(q.error && /column .* does not exist/i.test(q.error.message)){
        q = await selectJobs('id,title,location,employment_type,salary_min,salary_max').limit(limit);
      }
      return q;
    },
    async searchJobs({ q='', loc='', type='all', page=1, pageSize=12 }={}){
      let query = client.from('jobs')
        .select('id,title,location,employment_type,salary_min,salary_max,company', { count:'exact' })
        .eq('published', true);
      if(q)   query = query.ilike('title', `%${q}%`);
      if(loc) query = query.ilike('location', `%${loc}%`);
      if(type && type!=='all') query = query.eq('employment_type', type);
      query = query.order('created_at', { ascending:false })
                   .range((page-1)*pageSize, (page*pageSize)-1);
      const res = await query;
      if(res.error && /column .* does not exist/i.test(res.error.message)){
        // retry without company
        return client.from('jobs')
          .select('id,title,location,employment_type,salary_min,salary_max', { count:'exact' })
          .eq('published', true)
          .ilike('title', q?`%${q}%`:'%')
          .ilike('location', loc?`%${loc}%`:'%')
          .order('created_at', { ascending:false })
          .range((page-1)*pageSize, (page*pageSize)-1);
      }
      return res;
    },
    async getArticles(limit=6){
      return client.from('articles')
        .select('id,title,tag,excerpt,url,created_at')
        .eq('published', true)
        .order('created_at', { ascending:false })
        .limit(limit);
    }
  };

  // ---- Home helpers (safe to double-call; they no-op if targets absent) ----
  window.home = {
    async mountFeatured(){
      const wrap = document.querySelector('#featuredJobs');
      if(!wrap) return;
      try{
        wrap.innerHTML = '<div class="muted">Loading…</div>';
        const { data, error } = await db.featuredJobs(12);
        if(error) throw error;
        if(!data?.length){ wrap.innerHTML = '<div class="muted">No jobs to show yet.</div>'; return; }
        wrap.innerHTML = data.map(j=>`
          <article class="fj">
            <div class="t">${escapeHtml(j.title)}</div>
            <div class="m">· ${escapeHtml(j.location||'')} · ${escapeHtml(j.employment_type||'')}</div>
            <a class="btn-ghost sm" href="/job.html?id=${encodeURIComponent(j.id)}">View</a>
          </article>`).join('');
      }catch(e){
        console.error(e); wrap.innerHTML = '<div class="muted">Couldn’t load jobs. Please try again later.</div>';
      }
    },
    async mountArticles(){
      const wrap = document.querySelector('#articlesList');
      const edit = document.querySelector('#articlesEdit');
      if(!wrap) return;
      try{
        wrap.innerHTML = '<div class="muted">Loading…</div>';
        const { data, error } = await db.getArticles(6);
        if(error) throw error;
        if(!data?.length){ wrap.innerHTML = '<div class="muted">No articles yet.</div>'; return; }
        wrap.innerHTML = data.map(a=>`
          <a class="art" href="${a.url||'#'}" target="_blank" rel="noopener">
            <span class="tag">${escapeHtml(a.tag||'Article')}</span>
            <span class="title">${escapeHtml(a.title)}</span>
          </a>`).join('');
      }catch(e){
        console.error(e); wrap.innerHTML = '<div class="muted">Couldn’t load articles.</div>';
      }
      // hide Edit for everyone by default (avoid stray link)
      if(edit) edit.style.display='none';
    }
  };

  function escapeHtml(s=''){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
})();
</script>
