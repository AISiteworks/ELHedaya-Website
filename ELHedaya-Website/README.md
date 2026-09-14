# EL Hedaya Islamic School Website

Production website for EL Hedaya Islamic School / Clemmons Islamic Center.

## Included

- Public EL Hedaya school website
- `/register` integrated student registration
- Multiple children in one family registration
- Dynamic admin-controlled fee fields
- Square Web Payments checkout
- Server-side authoritative fee calculation
- Registration/payment dashboard inside the authenticated admin area
- Public gallery + hidden gallery administration
- Newsletter subscriptions and campaign administration
- Hostinger SMTP delivery
- PDF/image newsletter flyer attachments
- Supabase database/storage integration

## Stack

- React + Vite
- Vercel static hosting + `/api` serverless functions
- Supabase
- Square Web Payments
- Hostinger SMTP / Nodemailer

## Important routes

- `/` - public school website
- `/register` - student registration and Square payment
- `/gallery` - public gallery
- `/school-gallery-admin` - authenticated admin area
- `/newsletter/unsubscribe` - newsletter unsubscribe

## First-time setup

### 1. Supabase

Run the SQL files in Supabase SQL Editor as applicable:

1. `supabase/gallery.sql`
2. `supabase/newsletter.sql`
3. `supabase/newsletter-flyer-attachments.sql`
4. `supabase/registration.sql`

If the existing gallery/newsletter database is already live, only run the SQL that has not previously been applied.

### 2. Vercel variables

Copy the variable names from `.env.example` into Vercel. Never commit real secret values.

The browser-safe values use `VITE_`. Keep these server-side only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_PASSWORD`
- `SQUARE_ACCESS_TOKEN`

### 3. Square

Start with:

`SQUARE_ENVIRONMENT=sandbox`

Use Sandbox Application ID, Location ID and Access Token. Test successful, declined, multi-student and optional-fee registrations before switching to production credentials.

### 4. Build

```bash
npm install
npm run build
```

Vercel settings:

- Framework Preset: Vite
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## Registration API

The main configuration endpoint is:

`/api/registration-config`

A healthy deployed endpoint returns JSON with registration settings, fees and Square public configuration.

## Security

Card numbers are not stored by this application. Square's browser SDK tokenizes payment details and the Vercel serverless API creates the Square payment.

All registration totals are recalculated server-side from Supabase fee configuration.

Do not commit `.env`, Vercel secrets, Supabase service-role credentials, SMTP passwords or Square access tokens.


## Existing `students` table compatibility

The registration module uses `public.registration_students`, not `public.students`, so it can safely coexist with an existing school/student table.


## Square tokenization diagnostics

V13.2 sends full billing contact data to `card.tokenize()`, includes Square verification/3DS endpoints in the `/register` CSP, and exposes non-sensitive Square tokenization error details in the browser UI/console.


## Sandbox receipts

Square does not host receipts for Sandbox payments. V13.3 hides the receipt button in Sandbox and shows it only for Production payments.
