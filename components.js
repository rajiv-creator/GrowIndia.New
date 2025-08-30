/* components.js v21 — minimal, safe helpers (does not auto-modify the home page) */
(function () {
  const sb = window.supabase; // created in /config.js
  // light toasts
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
          setTimeout(() => el.remove(), 3200);
        } catch (e) {
          alert(msg);
        }
      },
    };
  }

  // app helpers used across pages
  if (!window.app) {
    window.app = {
      async getSessionUser() {
        const { data: { user }, error } = await sb.auth.getUser();
        if (error) throw error;
        return user;
      },
      async upsertProfile(payload) {
        // guarantee candidate as default to avoid NOT NULL errors
        if (!payload.role) payload.role = "candidate";
        return sb.from("profiles").upsert(payload, { onConflict: "user_id" });
      },
      async getProfile(user_id) {
        return sb.from("profiles").select("*").eq("user_id", user_id).maybeSingle();
      },
    };
  }

  // Optional DB helpers (nothing auto-runs)
  window.db = window.db || {
    searchJobs: async function ({ q = "", loc = "", type = "all", page = 1, pageSize = 12 } = {}) {
      let query = sb
        .from("jobs")
        .select("id,title,location,employment_type,salary_min,salary_max,company", { count: "exact" })
        .eq("published", true);
      if (q) query = query.ilike("title", `%${q}%`);
      if (loc) query = query.ilike("location", `%${loc}%`);
      if (type && type !== "all") query = query.eq("employment_type", type);
      return query.order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
    },
  };
})();
