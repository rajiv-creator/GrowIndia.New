/* components.js v23 — one file to wire auth, profile and jobs across pages */
(function () {
  const sb = () => window.supabase;

  if (!window.ui) {
    window.ui = {
      toast(msg, type = "info") {
        try {
          const el = document.createElement("div");
          el.textContent = msg;
          el.style.cssText =
            "position:fixed;right:16px;bottom:16px;background:#151B54;color:#fff;padding:10px 12px;border-radius:10px;z-index:9999;opacity:.95;font:600 14px/1.2 Inter,system-ui,Segoe UI,Roboto,Arial";
          if (type === "error") el.style.background = "#b91c1c";
          if (type === "success") el.style.background = "#166534";
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 3000);
        } catch { alert(msg); }
      },
    };
  }

  if (!window.app) {
    window.app = {
      async getSessionUser() {
        const out = await sb().auth.getUser(); if (out.error) throw out.error; return out.data.user;
      },
      isEmailConfirmed(user) {
        return !!(user?.email_confirmed_at || user?.confirmed_at || user?.user_metadata?.email_confirmed_at);
      },
      async upsertProfile(payload) {
        if (!payload.role) payload.role = "candidate";
        return sb().from("profiles").upsert(payload, { onConflict: "user_id" });
      },
    };
  }

  window.db = window.db || {
    async latestJobs(limit = 4) {
      return sb().from("jobs")
        .select("id,title,location,employment_type", { count: "exact" })
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(limit);
    },
  };

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (!sb()) throw new Error("Supabase script missing");
      console.debug("[growindia] scripts OK", { supabase: !!sb(), app: !!window.app });
    } catch (e) {
      ui.toast("Scripts not loaded correctly (Supabase).", "error");
      return;
    }

    const path = (location.pathname || "").toLowerCase();

    // LOGIN
    if (path.endsWith("/login") || path.endsWith("/login.html") || path === "/" || path === "") {
      const form = document.querySelector("form#loginForm") || document.querySelector("main form");
      if (form && !form.dataset.wired) {
        form.dataset.wired = "1";
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const btn = form.querySelector("button, .btn"); if (btn) btn.disabled = true;
          try {
            const email = form.querySelector('input[type="email"]')?.value?.trim();
            const password = form.querySelector('input[type="password"]')?.value;
            const { error } = await sb().auth.signInWithPassword({ email, password });
            if (error) throw error;
            const user = (await sb().auth.getUser()).data.user;
            if (!app.isEmailConfirmed(user)) {
              await sb().auth.signOut();
              ui.toast("Please verify your email first.", "error");
              return;
            }
            await app.upsertProfile({ user_id: user.id, role: "candidate" });
            location.href = "/dashboard.html";
          } catch (err) { ui.toast(err.message || "Sign-in failed", "error"); }
          finally { if (btn) btn.disabled = false; }
        });
      }
    }

    // REGISTER
    if (path.includes("register-candidate")) {
      const form = document.querySelector("form#signupForm") || document.querySelector("main form");
      if (form && !form.dataset.wired) {
        form.dataset.wired = "1";
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const btn = form.querySelector("button, .btn"); if (btn) btn.disabled = true;
          try {
            const full = document.querySelector("#full_name")?.value?.trim()
              || form.querySelector('input[placeholder="Full name"]')?.value?.trim() || "";
            const email = form.querySelector('input[type="email"]')?.value?.trim();
            const pass = form.querySelector('#password')?.value
              || form.querySelectorAll('input[type="password"]')[0]?.value;
            const pass2 = form.querySelector('#password2')?.value
              || form.querySelectorAll('input[type="password"]')[1]?.value;
            const phone = document.querySelector("#phone")?.value?.trim()
              || form.querySelectorAll('input[type="tel"]')[0]?.value?.trim() || "";

            if (!email || !pass) throw new Error("Please fill email and password.");
            if (pass !== pass2) throw new Error("Passwords do not match.");

            const { error } = await sb().auth.signUp({
              email, password: pass,
              options: { data: { full_name: full }, emailRedirectTo: location.origin + "/post-auth.html" }
            });
            if (error) throw error;

            const user = (await sb().auth.getUser()).data.user;
            if (user) {
              await app.upsertProfile({ user_id: user.id, role: "candidate", full_name: full, phone });
              location.href = "/dashboard.html#complete";
            } else {
              ui.toast("Check your inbox and verify your email, then sign in.", "success");
              location.href = "/login.html?notice=verify";
            }
          } catch (err) { ui.toast(err.message || "Sign-up failed", "error"); }
          finally { if (btn) btn.disabled = false; }
        });
      }
    }

    // DASHBOARD
    if (path.endsWith("/dashboard") || path.endsWith("/dashboard.html")) {
      try {
        const user = (await sb().auth.getUser()).data.user;
        if (!user) { location.href = "/login.html"; return; }
        if (!app.isEmailConfirmed(user)) { await sb().auth.signOut(); location.href = "/login.html"; return; }

        const nameEl = document.querySelector("#uName");
        if (nameEl) nameEl.textContent = user.user_metadata?.full_name || "Your name";

        const saveBtn = document.querySelector("#saveProfile");
        if (saveBtn && !saveBtn.dataset.wired) {
          saveBtn.dataset.wired = "1";
          saveBtn.addEventListener("click", async () => {
            const payload = {
              user_id: user.id, role: "candidate",
              full_name: document.querySelector("#p_full")?.value?.trim() || null,
              phone: document.querySelector("#p_phone")?.value?.trim() || null,
              headline: document.querySelector("#p_head")?.value?.trim() || null,
              expected_salary: (() => {
                const v = document.querySelector("#p_sal")?.value;
                return v ? parseInt(v, 10) : null;
              })(),
            };
            const { error } = await app.upsertProfile(payload);
            if (error) ui.toast(error.message, "error"); else ui.toast("Saved", "success");
          });
        }

        const jobsBox = document.querySelector("#jobs");
        if (jobsBox) {
          const { data, error } = await db.latestJobs(4);
          if (error) { jobsBox.innerHTML = `<div class="sub">Couldn’t load jobs.</div>`; }
          else if (!data?.length) { jobsBox.innerHTML = `<div class="sub">No jobs yet.</div>`; }
          else {
            jobsBox.innerHTML = "";
            data.forEach(j => {
              const el = document.createElement("div");
              el.className = "job";
              el.innerHTML = `<h4 style="margin:0 0 4px">${j.title}</h4>
                              <div class="sub">• ${j.location || "—"} • ${j.employment_type || ""}</div>
                              <div style="margin-top:8px"><a class="btn" href="/job.html?id=${j.id}">View</a></div>`;
              jobsBox.appendChild(el);
            });
          }
        }
      } catch (e) { ui.toast(e.message || "Error", "error"); }
    }
  });
})();
