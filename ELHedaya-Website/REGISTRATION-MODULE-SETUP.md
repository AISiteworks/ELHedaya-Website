# EL Hedaya Registration + Square Payments

This module is built directly into the existing EL Hedaya Vite website.

## Public route

- `https://elhedaya-cic.com/register`

Parents can:
- enter guardian information
- add multiple children in one registration
- review dynamically configured fees
- select optional fees
- pay the final server-calculated total through Square
- receive a registration number and Square receipt link

## Admin route

Use the existing hidden admin page:

- `https://elhedaya-cic.com/school-gallery-admin`

After signing in with the existing Supabase admin account, a new **Registration** tab appears next to Picture Gallery and Newsletter.

The Registration admin workspace includes:
- dashboard totals for registrations, students, collected fees, and outstanding fees
- searchable registration list
- family/student detail drawer
- payment status management
- Square receipt links when available
- dynamic fee builder
- registration open/closed switch
- school year, term, deadline, messages, and support contact settings

## 1. Create the Supabase tables

Open Supabase -> SQL Editor and run:

`supabase/registration.sql`

The SQL creates:
- `registration_settings`
- `registration_fees`
- `registrations`
- `students`
- `registration_fee_lines`
- `registration_payments`

It also creates admin-only RLS policies. Public registration writes do not go directly from the browser to Supabase. They go through Vercel server functions using the service-role key.

The initial fee is seeded as **Semester Tuition = $150 per student**. You can immediately change or delete it from Admin -> Registration -> Fees.

## 2. Add Square Sandbox credentials in Vercel

In Vercel -> Project -> Settings -> Environment Variables, add:

```env
SQUARE_ENVIRONMENT=sandbox
SQUARE_APPLICATION_ID=YOUR_SANDBOX_APPLICATION_ID
SQUARE_LOCATION_ID=YOUR_SANDBOX_LOCATION_ID
SQUARE_ACCESS_TOKEN=YOUR_SANDBOX_ACCESS_TOKEN
SQUARE_API_VERSION=2026-08-19
```

Your existing server-side variable is also required:

```env
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVER_SECRET
```

The site already uses these public Supabase values:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Security

Do not prefix the Square access token or Supabase service-role key with `VITE_`.
Do not commit `.env.local`, `.env`, or production secrets to GitHub.

## 3. Deploy

From the existing Git-connected website folder:

```cmd
npm install
npm run build
git add .
git commit -m "Add student registration and Square payments"
git push origin main
```

Vercel will deploy automatically from `main`.

## 4. Test in Square Sandbox first

1. Open `/school-gallery-admin`.
2. Open **Registration -> Settings**.
3. Confirm Registration is OPEN.
4. Open **Registration -> Fees** and configure the fee fields you want.
5. Visit `/register` in a private/incognito browser window.
6. Register a test family and child.
7. Complete the payment using Square Sandbox test card data from the Square Developer Dashboard/documentation.
8. Return to Admin -> Registration and confirm the registration shows **Paid** and the fee totals are correct.

Do not switch `SQUARE_ENVIRONMENT` to production until the complete Sandbox flow is verified.

## Fee builder behavior

Each fee supports:
- **Charge** or **Discount**
- **Per student** or **Per family**
- **Optional** or automatically included
- **Apply after X students** for sibling-style rules
- Active/inactive status
- Custom sort order

Examples:

- Tuition: Charge, per student, $150, apply after 0
- Book Fee: Charge, per student, $30, apply after 0
- Family Registration Fee: Charge, per family, $20
- Sibling Discount: Discount, per student, $15, apply after 1
- Optional Donation: Charge, per family, optional

The final total is always recalculated on the server from the active fee configuration before Square is charged. Browser-entered totals are never trusted.

## Payment statuses

The admin can see and manage:
- Pending
- Paid
- Offline Paid
- Failed
- Waived
- Refunded

`Offline Paid` is useful when a family pays by cash or check. It creates an offline payment record in the registration history.

## Production notes

The module includes a Square-compatible Content Security Policy on `/register`, server-side amount calculation, Square payment idempotency per payment attempt, Supabase RLS, and no storage of full card numbers.

Before accepting real payments, complete a full Sandbox test and then switch all Square credentials together to their Production equivalents.
