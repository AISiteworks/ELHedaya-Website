EL Hedaya V13.4 Admin Registration Tab Patch

Purpose:
Restore the Registration tab inside /school-gallery-admin without changing
the working public registration/payment flow.

Files included:
- src/components/GalleryAdminPage.jsx
- src/components/RegistrationAdmin.jsx
- src/services/registrationService.js
- src/styles.css

Apply:
1. Copy the src folder from this patch over the matching src folder in your
   Git-connected ELHedaya-Website project.
2. Replace matching files when Windows asks.
3. Run:
   npm run build
   git add .
   git commit -m "Restore registration admin tab"
   git push origin main
4. Wait for Vercel to show Ready.
5. Hard-refresh:
   https://www.elhedaya-cic.com/school-gallery-admin

Expected top tabs:
Picture Gallery | Newsletter | Registration
