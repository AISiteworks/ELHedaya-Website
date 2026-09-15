EL Hedaya V13.6 — Family Notes + Volunteer Experience

WHAT CHANGED
- Removed Parent Portal links/buttons from the public website.
- School hours updated to 10:30 AM–2:30 PM.
- Pickup reminder: pick up your child on time.
- Pickup/drop-off location: Main Parking Lot.
- Added a polished Sunday Family Notes section:
  • weekly newsletter
  • parent involvement / volunteer invitation
  • healthy snacks available for purchase or bring from home
  • snacks should be quick and easy to consume
- Added /volunteer with a functional volunteer interest form.
- Added School Administration → Volunteers to review, update, and delete submissions.

INSTALL
1. Copy the contents of this patch directly into the ROOT of your existing
   Git-connected ELHedaya-Website repository.
   IMPORTANT: copy src/, api/, supabase/, vercel.json etc. directly over the
   existing root. Do NOT copy the outer patch folder into your repo.

2. Run this once in Supabase SQL Editor:
   supabase/volunteers.sql

3. From the Git project root:
   npm run build
   git add -A
   git commit -m "Add volunteer page and update Sunday family information"
   git push origin main

4. Wait for Vercel to deploy, then test:
   https://www.elhedaya-cic.com/
   https://www.elhedaya-cic.com/volunteer
   https://www.elhedaya-cic.com/school-gallery-admin

NOTES
- The volunteer form saves submissions through /api/volunteer-submit using the
  existing SUPABASE_SERVICE_ROLE_KEY already configured in Vercel.
- No new Vercel environment variables are required.
- The old VITE_PORTAL_URL variable can remain in Vercel; V13.6 no longer uses it.
