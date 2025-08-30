<script>
/* =========================================================
   GrowIndia – Shared components
   - Header (with conditional CTAs)
   - Candidate sidebar (injected when signed in)
   - Small helpers
   ========================================================= */

(function () {
  const BRAND = 'GrowIndia Jobs';
  const BLUE = '#151B54';

  // Safe Supabase session helper
  async function getSession() {
    try {
      if (!window.supabase || !window.supabase.auth) return null;
      const { data } = await window.supabase.auth.getSession();
      return data?.session || null;
    } catch (e) {
      console.warn('Session check failed:', e);
      return null;
    }
  }

  function css(strings) {
    const style = document.createElement('style');
    style.setAttribute('data-gi', '1');
    style.textContent = String.raw(strings);
    document.head.appendChild(style);
  }

  // ---------- Header ----------
  async function renderHeader(opts = {}) {
    const onJobsPage = /\/jobs/i.test(location.pathname);
    const onDashboard = /\/dashboard/i.test(location.pathname);
    const bodyWantsHide = document.body.dataset.hideCtas === '1';

    // Default: show CTAs except on jobs/dashboard or when page asks to hide
    const showCTAs = opts.showCTAs ?? !(onJobsPage || onDashboard || bodyWantsHide);

    const session = await getSession();
    const isAuthed = !!session;

    const header = document.querySelector('#site-header') || (() => {
      const h = document.createElement('header');
      h.id = 'site-header';
      document.body.prepend(h);
      return h;
    })();

    header.innerHTML = `
      <div class="gi-nav">
        <a class="gi-brand" href="/">${BRAND}</a>
        <div class="gi-actions">
          ${(!showCTAs || isAuthed) ? '' : `
            <a class="gi-cta gi-candidate" href="/register-candidate.html">Candidate</a>
            <a class="gi-cta gi-employer"  href="/register-employer.html">Employer</a>
          `}
        </div>
      </div>
    `;

    // Header styles (minimal, scoped)
    css`
      #site-header{position:sticky;top:0;z-index:40;background:#fff;border-bottom:1px solid #eef0f3}
      .gi-nav{max-width:1200px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between}
      .gi-brand{font-weight:700;text-decoration:none;color:${BLUE}}
      .gi-actions{display:flex;gap:12px}
      .gi-cta{display:inline-block;padding:10px 18px;border-radius:999px;font-weight:600;text-decoration:none}
      .gi-candidate{background:${BLUE};color:#fff}
      .gi-employer{background:#ff8a00;color:#fff}
    `;
  }

  // ---------- Candidate Sidebar ----------
  async function injectCandidateSidebar() {
    const onJobsPage = /\/jobs/i.test(location.pathname);
    const onDashboard = /\/dashboard/i.test(location.pathname);
    if (!onJobsPage && !onDashboard) return; // rail only on jobs + dashboard

    const session = await getSession();
    if (!session) return; // only signed-in users get the rail

    // Insert sidebar once
    if (document.querySelector('.gi-rail')) return;

    const rail = document.createElement('aside');
    rail.className = 'gi-rail';
    rail.innerHTML = `
      <div class="gi-rail-card">
        <div class="gi-rail-meter">
          <div class="gi-meter-pie"></div>
          <div class="gi-meter-text">17%</div>
        </div>
        <div class="gi-rail-name">Your name</div>
        <a class="gi-rail-primary" href="/dashboard#complete">Complete profile</a>
      </div>

      <div class="gi-rail-stats">
        <div class="gi-stat">
          <div class="gi-stat-label">Search appearances</div>
          <div class="gi-stat-num">0</div>
        </div>
        <div class="gi-stat">
          <div class="gi-stat-label">Recruiter actions</div>
          <div class="gi-stat-num">0</div>
        </div>
        <a class="gi-rail-boost" href="/dashboard#boost">Get 3× boost →</a>
      </div>

      <nav class="gi-rail-nav">
        <a class="gi-link" href="/dashboard">My home</a>
        <a class="gi-link gi-link--active" href="/jobs">Jobs</a>
        <a class="gi-link" href="/companies.html">Companies</a>
        <a class="gi-link" href="/blogs.html">Blogs</a>
      </nav>
    `;
    document.body.appendChild(rail);
    document.body.classList.add('gi-with-rail');

    // Styles for rail
    css`
      .gi-with-rail{--rail:280px;}
      @media(min-width:1024px){
        .gi-with-rail main,.gi-with-rail #content{padding-left:var(--rail)}
        .gi-rail{position:fixed;top:70px;left:0;width:var(--rail);padding:14px 12px;height:calc(100vh - 70px);overflow:auto;border-right:1px solid #eef0f3;background:#fff;z-index:30}
      }
      .gi-rail-card{background:#fff;border:1px solid #eef0f3;border-radius:16px;padding:16px;margin-bottom:12px}
      .gi-rail-meter{display:flex;align-items:center;gap:12px}
      .gi-meter-pie{width:64px;height:64px;border-radius:50%;background:conic-gradient(${BLUE} 17%, #e8ecf3 0)}
      .gi-meter-text{font-weight:700}
      .gi-rail-name{font-weight:700;margin:6px 0 10px}
      .gi-rail-primary{display:inline-block;background:${BLUE};color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600}
      .gi-rail-stats{background:#fff;border:1px solid #eef0f3;border-radius:16px;padding:14px;margin-bottom:12px}
      .gi-stat{display:flex;align-items:center;justify-content:space-between;padding:6px 0}
      .gi-stat-label{color:#667085;font-size:14px}
      .gi-stat-num{font-weight:700}
      .gi-rail-boost{display:block;margin-top:10px;font-weight:600;text-decoration:none;color:${BLUE}}
      .gi-rail-nav{background:#fff;border:1px solid #eef0f3;border-radius:16px;padding:8px}
      .gi-link{display:block;padding:10px 12px;text-decoration:none;border-radius:10px;color:#0f172a}
      .gi-link--active,.gi-link:hover{background:#f3f5fb}
    `;
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', async () => {
    await renderHeader();       // builds the top header
    await injectCandidateSidebar(); // adds rail on jobs/dashboard if signed in
  });

  // Expose for pages that want to control options explicitly
  window.GI = { renderHeader, injectCandidateSidebar };
})();
</script>
