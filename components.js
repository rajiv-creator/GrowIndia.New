/* components.js (v13) */
(() => {
  const sb = window.supabase;

  // ---------- UI ----------
  const ToastHostId = 'toast-host';
  function ensureToastHost(){ let h=document.getElementById(ToastHostId); if(!h){h=document.createElement('div');h.id=ToastHostId;h.style.position='fixed';h.style.right='16px';h.style.bottom='16px';h.style.zIndex='9999';h.style.display='flex';h.style.flexDirection='column';h.style.gap='8px';document.body.appendChild(h);} return h; }
  function toast(msg,type='info',ms=3800){ const h=ensureToastHost(); const el=document.createElement('div'); el.textContent=msg; el.style.padding='10px 12px'; el.style.borderRadius='10px'; el.style.fontSize='14px'; el.style.boxShadow='0 4px 10px rgba(0,0,0,.15)'; el.style.background= type==='success'?'#0ea5e9': type==='error'?'#ef4444': type==='warn'?'#f59e0b':'#334155'; el.style.color='#fff'; h.appendChild(el); setTimeout(()=>el.remove(),ms); }
  const ui={ toast, success:m=>toast(m,'success'), error:m=>toast(m,'error'), warn:m=>toast(m,'warn'),
    setLoading(btn,loading,label){ if(!btn) return; btn.dataset.origText ??= btn.textContent; btn.disabled=!!loading; btn.style.opacity=loading?'0.7':'1'; btn.textContent=loading?'Please wait…':(label ?? btn.dataset.origText); }
  };

  // ---------- Helpers ----------
  function q(s,r=document){return r.querySelector(s)}
  function qa(s,r=document){return [...r.querySelectorAll(s)]}
  function escapeHTML(str=''){return String(str).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
  function serializeForm(f){const fd=new FormData(f),o={}; for(const [k,v] of fd.entries()) o[k]=v; qa('input[type="checkbox"]',f).forEach(cb=>o[cb.name]=cb.checked); return o;}
  function numberOrNull(v){ if(v===''||v==null) return null; const n=Number(v); return Number.isFinite(n)?n:null;}
  function setQueryParams(obj){ const url=new URL(location.href); Object.entries(obj).forEach(([k,v])=>{ if(v==null||v===''||v==='all') url.searchParams.delete(k); else url.searchParams.set(k,v); }); history.replaceState(null,'',url.toString()); }
  function debounce(fn,ms=300){ let t=null; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms)} }

  // ---------- Auth ----------
  async function getSession(){ const {data,error}=await sb.auth.getSession(); if(error) throw error; return {session:data.session,user:data.session?.user??null}; }
  async function requireAuth(){ const {user}=await getSession(); if(!user){ ui.warn('Please sign in.'); throw new Error('AUTH_REQUIRED'); } return user; }
  async function isAdmin(userId){ const {data,error}=await sb.from('admins').select('user_id').eq('user_id',userId).maybeSingle(); if(error) return false; return !!data; }

  // ---------- DB: companies / jobs / applications ----------
  const db = {
    // COMPANIES
    async myCompanies(userId){ const {data,error}=await sb.from('companies').select('id,name,website,created_at').eq('owner_id',userId).order('created_at',{ascending:false}); if(error) throw error; return data||[]; },
    async createCompany({name,website,owner_id}){ const payload={ name:name?.trim(), website:website?.trim()||null, ...(owner_id?{owner_id}:{}) }; const {data,error}=await sb.from('companies').insert(payload).select('id,name,website').maybeSingle(); if(error) throw error; return data; },

    // JOBS
    async createJob(job){ const payload={ title:job.title?.trim(), location:job.location?.trim(), employment_type:job.employment_type, min_salary:numberOrNull(job.min_salary), max_salary:numberOrNull(job.max_salary), currency:(job.currency||'INR').trim(), description:job.description?.trim()||null, company_id:job.company_id, published:!!job.published }; const {data,error}=await sb.from('jobs').insert(payload).select('id').maybeSingle(); if(error) throw error; return data; },
    async updateJob(id,patch){ const payload={ ...(patch.title!==undefined?{title:patch.title?.trim()}:{}), ...(patch.location!==undefined?{location:patch.location?.trim()}:{}), ...(patch.employment_type!==undefined?{employment_type:patch.employment_type}:{}), ...(patch.min_salary!==undefined?{min_salary:numberOrNull(patch.min_salary)}:{}), ...(patch.max_salary!==undefined?{max_salary:numberOrNull(patch.max_salary)}:{}), ...(patch.currency!==undefined?{currency:(patch.currency||'INR').trim()}:{}), ...(patch.description!==undefined?{description:patch.description?.trim()||null}:{}), ...(patch.published!==undefined?{published:!!patch.published}:{}) }; const {data,error}=await sb.from('jobs').update(payload).eq('id',id).select('id').maybeSingle(); if(error) throw error; return data; },
    async deleteJob(id){ const {error}=await sb.from('jobs').delete().eq('id',id); if(error) throw error; return true; },
    async toggleJobPublished(id,next){ const {error}=await sb.from('jobs').update({published:next}).eq('id',id); if(error) throw error; return true; },
    async myJobsByCompanyIds(ids=[]){ if(!ids.length) return []; const {data,error}=await sb.from('jobs').select('id,title,location,employment_type,published,created_at,company_id,company:companies(name)').in('company_id',ids).order('created_at',{ascending:false}); if(error) throw error; return data||[]; },

    _applyJobFilters(qry,{location,employment_type}={}){ qry=qry.eq('published',true); if(location && location!=='all') qry=qry.ilike('location',location); if(employment_type && employment_type!=='all') qry=qry.ilike('employment_type',employment_type); return qry; },
    async listJobsPaged({page=1,pageSize=10,location,employment_type,q=null,sort='newest'}={}){ const from=(page-1)*pageSize, to=from+pageSize-1;
      let qc=sb.from('jobs').select('id',{count:'exact',head:true}); qc=db._applyJobFilters(qc,{location,employment_type}); if(q) qc=qc.textSearch('search_tsv',q,{type:'websearch',config:'english'}); const {count,error:ce}=await qc; if(ce) throw ce;
      let qd=sb.from('jobs').select('id,title,location,employment_type,min_salary,max_salary,currency,created_at,description,company:companies(name,website)'); qd=db._applyJobFilters(qd,{location,employment_type}); if(q) qd=qd.textSearch('search_tsv',q,{type:'websearch',config:'english'});
      if(sort==='pay-max') qd=qd.order('max_salary',{ascending:false,nullsLast:true}).order('created_at',{ascending:false});
      else if(sort==='pay-min') qd=qd.order('min_salary',{ascending:false,nullsLast:true}).order('created_at',{ascending:false});
      else qd=qd.order('created_at',{ascending:false});
      qd=qd.range(from,to);
      const {data,error:de}=await qd; if(de) throw de; return {rows:data||[], total:count??0}; },

    async distinctJobFilters(){ const {data,error}=await sb.from('jobs').select('location,employment_type').eq('published',true).limit(2000); if(error) throw error;
      const uniq=a=>Array.from(new Set((a||[]).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b))); return {locations:uniq((data||[]).map(r=>r.location)), employment_types:uniq((data||[]).map(r=>r.employment_type))}; },
    async getJobByIdPublic(id){ const {data,error}=await sb.from('jobs').select('id,title,location,employment_type,min_salary,max_salary,currency,description,published,created_at,company_id,company:companies(name,website)').eq('id',id).maybeSingle(); if(error) throw error; return data; },

    // APPLICATIONS
    async applyToJob({job_id,candidate_name,email,message}){ const payload={ job_id, candidate_name:candidate_name?.trim(), email:email?.trim(), message:message?.trim()||null }; const {error}=await sb.from('applications').insert(payload); if(error) throw error; return true; },
    async appsForJobIds(jobIds=[],{page=1,pageSize=100,q=null}={}){ if(!jobIds.length) return {rows:[],total:0}; const from=(page-1)*pageSize, to=from+pageSize-1;
      const orF=q?`candidate_name.ilike.%${q}%,email.ilike.%${q}%,message.ilike.%${q}%`:null;
      let qc=sb.from('applications').select('id',{count:'exact',head:true}).in('job_id',jobIds); if(orF) qc=qc.or(orF); const {count}=await qc;
      let qd=sb.from('applications').select('id,job_id,candidate_name,email,message,created_at').in('job_id',jobIds).order('created_at',{ascending:false}).range(from,to); if(orF) qd=qd.or(orF);
      const {data}=await qd; return {rows:data||[], total:count??0}; },

    // -------- PROFILES (new) --------
    async getProfile(userId){ const {data,error}=await sb.from('profiles').select('user_id,role,full_name,phone').eq('user_id',userId).maybeSingle(); if(error) throw error; return data||null; },
    async saveProfile({user_id,role,full_name,phone}){ const payload={user_id,role,full_name:full_name?.trim()||null,phone:phone?.trim()||null}; const {error}=await sb.from('profiles').upsert(payload,{onConflict:'user_id'}); if(error) throw error; return true; }
  };

  window.app={ ui,q,qa,escapeHTML,serializeForm,numberOrNull,setQueryParams,debounce,getSession,requireAuth,isAdmin,db };
})();
