# EL Hedaya Newsletter Flyer Attachments — V10

This update adds one optional flyer attachment to each newsletter.

## What administrators can attach

- PDF
- JPG / JPEG
- PNG
- WEBP
- GIF
- Maximum size: 10 MB

For best email delivery, keep flyers under about 2–3 MB when possible.

## How it works

1. The administrator chooses a flyer in the Newsletter composer.
2. The browser uploads it to a private Supabase Storage bucket named `newsletter-attachments`.
3. The flyer is never exposed through a public URL.
4. `/api/send-newsletter` verifies the logged-in Supabase administrator.
5. The Vercel API downloads the private flyer with the Supabase service-role key.
6. Nodemailer attaches it to every outgoing Hostinger SMTP message.
7. A test email keeps the flyer so the administrator can send the same draft to subscribers afterward.
8. After a real subscriber send succeeds, the temporary Storage object is removed automatically.

## Step 1 — Run the Supabase migration

Open Supabase → SQL Editor and run:

`supabase/newsletter-flyer-attachments.sql`

This creates the private Storage bucket, admin-only Storage policies, and adds `attachment_name` to newsletter campaign history.

If you are setting up the entire newsletter system from scratch, the updated `supabase/newsletter.sql` already contains the same flyer setup.

## Step 2 — Copy the updated files

Copy this V10 update into the existing Git-connected EL Hedaya project and replace matching files.

Important updated files:

- `src/components/NewsletterAdmin.jsx`
- `src/services/newsletterService.js`
- `src/styles.css`
- `api/send-newsletter.js`
- `supabase/newsletter.sql`

## Step 3 — Environment variables

No new environment variable is required when using the default bucket name.

The code defaults to:

`newsletter-attachments`

Optional only if you intentionally use another bucket name:

- Browser: `VITE_NEWSLETTER_ATTACHMENT_BUCKET`
- Server: `NEWSLETTER_ATTACHMENT_BUCKET`

If either is customized, both values must match.

Your existing SMTP and Supabase server variables remain unchanged.

## Step 4 — Build and deploy

Run:

```cmd
npm run build
git add .
git commit -m "Add newsletter flyer attachments"
git push origin main
```

Vercel will deploy automatically.

## Step 5 — Test safely

1. Sign in to the hidden school admin page.
2. Open Newsletter.
3. Create a small test message.
4. Choose a PDF or image flyer.
5. Click **Send Test to Me**.
6. Confirm the flyer arrives as a real email attachment.
7. If correct, send the newsletter to subscribers.

The flyer attachment is optional. Newsletters without a flyer continue working exactly as before.
