/* components.js v22 */
(function () {
  const sb = window.supabase;

  // tiny toast
  if (!window.ui) {
    window.ui = {
      toast(msg, type = "info") {
        try {
          const el = document.createElement("div");
          el.textContent = msg;
          el.style.cssText =
            "position:fixed;right:16px;bottom:16px;background:#151B54;color:#fff;padding:10px 12px;border-radius:10px;z-index:9999;opacity:.95";
          if (type === "error") el.style.background = "#b91c1c";
          if (type === "success") el.style.background = "#166534";
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 3000);
        } catch { alert(msg); }
      }
    };
  }

  // app helpers (used by register/login/dashboard)
  if (!window.app) {
    window.app = {
      async getSessionUser() {
        const { data: { user }, error } = await sb.auth.getUser();
        if (error) throw error;
        return user;
      },
      async upsertProfile(payload) {
        if (!payload.role) payload.role = "candidate";
        return sb.from("profiles").upsert(payload, { onConflict: "user_id" });
      },
      // Block unverified users even if Supabase setting allows it
      isEmailConfirmed(user) {
        return !!(user?.email_confirmed_at || user?.confirmed_at || user?.user_metadata?.email_confirmed_at);
      }
    };
  }

  // very small jobs helper (used on dashboard -> “Recommended jobs”)
  window.db = window.db || {
    async latestJobs(limit = 4) {
      return sb.from("jobs")
        .select("id,title,location,employment_type,company", { count: "exact" })
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(limit);
    }
  };

  // generic “scroll-to” action: put data-scroll="#targetId" on any button/link
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-scroll]");
    if (!el) return;
    const sel = el.getAttribute("data-scroll");
    const tgt = document.querySelector(sel);
    if (tgt) tgt.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
