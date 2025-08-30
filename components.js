<script>
// components.js — v18

(() => {
  // Expect window.supabase created in /config.js
  const BLUE = '#151B54';
  const BLUE_DARK = '#101542';
  const ORANGE = '#FF6E00';

  // ---------------- UI helpers ----------------
  const ui = {
    toast(msg, type='info') {
      let el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = `
        position:fixed; right:16px; bottom:16px; z-index:9999;
        background:${type==='error' ? '#B91C1C' : BLUE};
        color:#fff; padding:10px 14px; border-radius:10px;
        box-shadow:0 10px 20px rgba(0,0,0,.18); font:500 14px/1.2 Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    },
    qs(sel, root=document){ return root.querySelector(sel); },
    qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; },
  };
  window.ui = ui;

  // -------------- Header (per-page control) --------------
  function renderHeader({ showRoleCTAs = true } = {}) {
    const hdr = document.createElement('header');
    hdr.innerHTML = `
      <style>
        header.site-hd{background:#fff;border-bottom:1px solid #E5E7EB}
        .hd-wrap{max-width:1200px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
        .brand{font:700 20px Inter,system-ui; color:${BLUE}}
        .right{display:flex;gap:12px;align-items:center}
        .pill{display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;font:600 14px Inter,system-ui;color:#fff;background:${BLUE}; box-shadow:0 6px 16px rgba(2,6,23,.12)}
        .pill.orange{background:${ORANGE};color:#fff}
        .pill:focus-visible{outline:2px solid ${BLUE}}
        @media (max-width:560px){ .pill{padding:8px 14px} .brand{font-size:18px}}
      </style>
      <div class="hd-wrap">
        <a class="brand" href="/">GrowIndia Jobs</a>
        <div class="right">
          ${showRoleCTAs ? `
            <a class="pill" href="/register-candidate.html">Candidate</a>
            <a class="pill orange" href="/login.html?role=employer">Employer</a>
          ` : ``}
        </div>
      </div>
    `;
    hdr.className = 'site-hd';
    document.body.prepend(hdr);
  }

  // expose minimal “app”
  const app = {
    header: renderHeader,
    async getSessionUser() {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;
    },
  };
  window.app = app;

  // ---------------- DB helpers (robust) ----------------
  // NOTE: We fetch * and filter on the client so we don't crash if a column
  // name differs (e.g. company vs company_name). Only 'published' is assumed.
  const db = {
    async fetchAllPublishedJobs() {
      // primary attempt with server filter
      let { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('published', true);

      // If RLS or schema mismatch blocks the above, try without server filter
      if (error) {
        console.warn('[jobs] primary fetch failed:', error.message);
        ({ data, error } = await supabase.from('jobs').select('*'));
        if (error) {
          throw error;
        }
      }
      // Ensure only published
      const safe = (data || []).filter(j => {
        const v = j.published;
        return v === true || v === 'true' || v === 1;
      });
      return safe;
    },

    /**
     * Client-side search + filters + pagination
     * @param {{q?: string, loc?: string, type?: string, page?: number, pageSize?: number}} opts
     */
    async searchJobs(opts = {}) {
      const {
        q = '', loc = '', type = 'all',
        page = 1, pageSize = 12
      } = opts;

      const all = await db.fetchAllPublishedJobs();

      const term = q.trim().toLowerCase();
      const locTerm = loc.trim().toLowerCase();
      const typeTerm = (type || 'all').toLowerCase();

      const read = (obj, ...candidates) => {
        for (const k of candidates) if (k in obj && obj[k] != null) return String(obj[k]);
        return '';
      };

      let filtered = all.filter(j => {
        const hay = [
          read(j, 'title'),
          read(j, 'description'),
          read(j, 'company'),
          read(j, 'company_name'),
          read(j, 'location'),
          read(j, 'city'),
          read(j, 'state')
        ].join(' ').toLowerCase();

        const matchesTerm = term ? hay.includes(term) : true;

        const jobType = read(j, 'employment_type', 'type').toLowerCase();
        const matchesType = (typeTerm === 'all' || !typeTerm) ? true : jobType.includes(typeTerm);

        const jobLoc = (read(j, 'location', 'city', 'state')).toLowerCase();
        const matchesLoc = locTerm ? jobLoc.includes(locTerm) : true;

        return matchesTerm && matchesType && matchesLoc;
      });

      // sort newest first using created_at (fallback to id)
      filtered.sort((a,b) => {
        const A = (a.created_at || a.createdAt || a.id || 0);
        const B = (b.created_at || b.createdAt || b.id || 0);
        return String(B).localeCompare(String(A));
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      return { items, total, totalPages };
    },

    async featuredJobs(limit = 8) {
      const all = await db.fetchAllPublishedJobs();
      // same newest-first
      all.sort((a,b) => String(b.created_at||b.id||0).localeCompare(String(a.created_at||a.id||0)));
      return all.slice(0, limit);
    }
  };
  window.db = db;

})();
</script>
