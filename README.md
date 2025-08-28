
# GrowIndia Jobs — Fast Start (Static + Supabase)

This is a ready-to-upload starter so you can ship quickly on Vercel (static hosting) using Supabase.

## What you get
- Public pages: `jobs.html` (list with search/pagination), `job.html?id=...` (detail + apply)
- Auth: magic-link login on `index.html`, session landing on `post-auth.html`
- Employer dashboard: `employer.html` for company + job posting
- Admin view: `admin.html` listing all companies and jobs
- Applications: public form that inserts into an `applications` table (no server needed)
- Minimal CSS + dark mode toggle, shared header/navigation

## Quick setup (5–10 minutes)

1. **Create `config.js` from the sample**
   - Copy `config.sample.js` → `config.js`
   - Fill your Supabase values:
     ```js
     window.SUPABASE_URL = "https://YOUR-REF.supabase.co";
     window.SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
     ```

2. **Run the SQL**
   - Open Supabase → **SQL Editor**
   - Paste and run the contents of `supabase.sql`
   - (Optional) make yourself admin:
     ```sql
     insert into public.admins (user_id)
     select id from auth.users where email = 'YOUR_EMAIL_HERE';
     ```

3. **Auth URLs**
   - Supabase → **Authentication → URL Configuration**
     - **Site URL**: `https://YOUR-Vercel-domain`
     - **Additional Redirect URLs**:
       - `https://YOUR-Vercel-domain/post-auth.html`
       - (add localhost versions if you test locally)

4. **Deploy**
   - Upload the folder to your GitHub repo and let Vercel deploy
   - Ensure `/config.js` is present at the site root and loads after Supabase script

## Notes
- Job applications are open to public inserts (`applications` table) for speed. Add Captcha later if needed.
- All pages expect scripts in this order:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="/config.js"></script>
  <script src="/assets/components.js"></script>
  ```
- You can style in `assets/app.css`.

## Next steps (optional)
- Add logo uploads (Supabase Storage)
- Moderation: add `published=false` default and toggle in employer/admin
- Email notifications via Supabase Functions or third-party API
