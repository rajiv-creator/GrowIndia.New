/* components.js (v6) — plain JS helpers + Supabase wrappers
   Relies on window.supabase (from /config.js) and optional window.sbAuth */

(() => {
  const sb = window.supabase;

  // ---------- UI ----------
  const ToastHostId = 'toast-host';
  function ensureToastHost() {
    let host = document.getElementById(ToastHostId);
    if (!host) {
      host = document.createElement('div');
      host.id = ToastHostId;
      host.style.position = 'fixed';
      host.style.right = '16px';
      host.style.bottom = '16px';
      host.style.zIndex = '9999';
      host.style.display = 'flex';
      host.style.flexDirection = 'column';
      host.style.gap = '8px';
      document.body.appendChild(host);
    }
    return host;
  }
  function toast(msg, type = 'info', timeout = 4000) {
    const host = ensureToastHost();
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.padding = '10px 12px';
    el.style.borderRadius = '8px';
    el.style.fontSize = '14px';
    el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
    el.style.background = (
      type === 'success' ? '#0ea5e9' :
      type === 'error'   ? '#ef4444' :
      type === 'warn'    ? '#f59e0b' : '#334155'
    );
    el.style.color = 'white';
    host.appendChild(el);
    setTimeout(() => el.remove(), timeout);
  }
  const ui = {
    toast, success: (m)=>toast(m,'success'), error:(m)=>toast(m,'error'), warn:(m)=>toast(m,'warn'),
    setLoading(btn, isLoading, labelWhenDone) {
      if (!btn) return;
      btn.dataset.origText ??= btn.textContent;
      btn.disabled = !!isLoading;
      btn.style.opacity = isLoading ? '0.7' : '1';
      btn.textContent = isLoading ? 'Please wait…' : (labelWhenDone ?? btn.dataset.origText);
    },
  };

  // ---------- Auth ----------
  async function getSession() {
    // Prefer your wrapper if present
    if (window.sbAuth?.getSession) {
      try {
        const s = await window.sbAuth.getSession();
        if (s?.user) return { session: s, user: s.user };
      } catch (_) {}
    }
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return { session: data.session, user: data.session?.user ?? null };
  }

  async function requireAuth() {
    const { user } = await getSession();
    if (!user) {
      ui.warn('Please sign in to continue.');
      throw new Error('AUTH_REQUIRED');
    }
    return user;
  }

  async function isAdmin(userId) {
    const { data, error } = await sb.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (error) {
      console.warn('admin check failed', error);
      return false;
    }
    return !!data?.user_id;
  }

  // ---------- Helpers ----------
  function q(sel, root=document) { return root.querySelector(sel); }
  function qa(sel, root=document) { return [...root.querySelectorAll(sel)]; }
  function escapeHTML(str='') {
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function serializeForm(form) {
    const fd = new FormData(form);
    const obj = {};
    for (const [k,v] of fd.entries()) obj[k] = v;
    // coerce checkbox values
    qa('input[type="checkbox"]', form).forEach(cb => obj[cb.name] = cb.checked);
    return obj;
  }
  function numberOrNull(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function getQueryParam(name) {
    return new URL(location.href).searchParams.get(name);
  }

  // ---------- DB API ----------
  const db = {
    // COMPANIES
    async myCompanies(userId) {
      const { data, error } = await sb
        .from('companies')
        .select('id,name,website,created_at')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async createCompany({ name, website }) {
      const payload = { name: name?.trim(), website: website?.trim() || null };
      const { data, error } = await sb.from('companies').insert(payload).select('id,name,website').maybeSingle();
      if (error) throw error;
      return data;
    },

    // JOBS (owner)
    async createJob(job) {
      const payload = {
        title: job.title?.trim(),
        location: job.location?.trim(),
        employment_type: job.employment_type,
        min_salary: numberOrNull(job.min_salary),
        max_salary: numberOrNull(job.max_salary),
        currency: (job.currency || 'INR').trim(),
        description: job.description?.trim() || null,
        company_id: job.company_id,
        published: !!job.published
      };
      const { data, error } = await sb.from('jobs').insert(payload).select('id').maybeSingle();
      if (error) throw error;
      return data;
    },

    // JOBS (public listing)
    _applyJobFilters(query, { location, employment_type } = {}) {
      query = query.eq('published', true);
      if (location && location !== 'all') query = query.ilike('location', location);
      if (employment_type && employment_type !== 'all') query = query.eq('employment_type', employment_type);
      return query;
    },

    async listJobsPaged({ page=1, pageSize=10, location, employment_type } = {}) {
      const from = (page-1) * pageSize;
      const to = from + pageSize - 1;

      // count
      let qCount = sb.from('jobs').select('id', { count: 'exact', head: true });
      qCount = db._applyJobFilters(qCount, { location, employment_type });
      const { count, error: countErr } = await qCount;
      if (countErr) throw countErr;

      // data
      let q = sb.from('jobs')
        .select('id,title,location,employment_type,min_salary,max_salary,currency,created_at,company:companies(name,website)')
        .order('created_at', { ascending: false });
      q = db._applyJobFilters(q, { location, employment_type }).range(from, to);

      const { data, error } = await q;
      if (error) throw error;

      return { rows: data || [], total: count ?? 0 };
    },

    async distinctJobFilters() {
      // pragmatic approach: get a capped set and derive uniques
      const { data, error } = await sb.from('jobs')
        .select('location,employment_type').eq('published', true).limit(1000);
      if (error) throw error;
      const locs = new Set(), types = new Set();
      (data || []).forEach(r => { if (r.location) locs.add(r.location); if (r.employment_type) types.add(r.employment_type); });
      return { locations: [...locs].sort(), employment_types: [...types].sort() };
    },

    async getJobByIdPublic(id) {
      const { data, error } = await sb.from('jobs')
        .select('id,title,location,employment_type,min_salary,max_salary,currency,description,published,created_at,company_id,company:companies(name,website)')
        .eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },

    // APPLICATIONS
    async applyToJob({ job_id, candidate_name, email, message }) {
      const payload = {
        job_id,
        candidate_name: candidate_name?.trim(),
        email: email?.trim(),
        message: message?.trim() || null
      };
      const { error } = await sb.from('applications').insert(payload);
      if (error) throw error;
      return true;
    }
  };

  // expose
  window.app = { ui, q, qa, escapeHTML, serializeForm, getQueryParam, getSession, requireAuth, isAdmin, db };
})();
