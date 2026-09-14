EL Hedaya V13.5 - Delete Registration Patch

Adds a Delete button beside the View button in Admin > Registration > Registrations.

Behavior:
- Requires confirmation before deleting.
- Deletes the registration from Supabase.
- Linked registration_students, registration_fee_lines, and registration_payments are removed by existing ON DELETE CASCADE relationships.
- Refreshes dashboard totals after deletion.
- Warns that deleting a paid registration DOES NOT refund or reverse the Square payment.

Apply by copying the src folder over the root src folder of your Git-connected ELHedaya-Website project, then:

npm run build
git add .
git commit -m "Add registration delete action"
git push origin main
