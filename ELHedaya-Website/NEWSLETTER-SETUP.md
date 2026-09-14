# EL Hedaya Newsletter V9 — Hostinger SMTP via Vercel API

This update keeps the V8 newsletter UI/database design but replaces **Resend + Supabase Edge Function email delivery** with your own Hostinger mailbox:

`newsletter@elhedaya-cic.com`

The secure delivery path is:

**Admin browser → `/api/send-newsletter` on Vercel → Hostinger SMTP → individual subscriber inboxes**

The browser never receives the mailbox password or Supabase service-role key.

## What stays the same

- Public newsletter signup on the homepage
- Supabase `newsletter_subscribers` database
- Unique unsubscribe links and `/newsletter/unsubscribe`
- Hidden admin Newsletter tab
- Subscriber search + activate/deactivate controls
- Branded newsletter composer/preview
- Test-send to the signed-in administrator
- Campaign/send history

## What changed

- `src/services/newsletterService.js` now calls `/api/send-newsletter` instead of a Supabase Edge Function.
- `api/send-newsletter.js` is a Vercel serverless function using Nodemailer + Hostinger SMTP.
- The old `supabase/functions/send-newsletter` function is no longer required.

## 1. Copy the update into your existing Git-connected website

Copy all files/folders from this package into the root of your existing project and choose **Replace** for matching files.

This package intentionally does not replace your current `package.json` or `package-lock.json` because your live project already contains dependency/build fixes.

## 2. Install Nodemailer

From your existing project folder:

```cmd
npm install nodemailer
```

Then confirm the frontend still builds:

```cmd
npm run build
```

`nodemailer` must be committed in both `package.json` and `package-lock.json` so Vercel can install it.

## 3. Run the newsletter database SQL (only if you have not already done V8)

In Supabase **SQL Editor**, run:

`supabase/newsletter.sql`

If you already ran this for V8, you do not need to run it again.

## 4. Get the Supabase service-role key

In your Supabase project, obtain the server-side **service role / secret key**.

This key bypasses RLS and is required only by the protected Vercel API so it can retrieve active subscribers and write campaign history.

**Never** put it in a variable beginning with `VITE_`, never paste it into frontend code, and never commit it to GitHub.

## 5. Add Vercel server environment variables

Open:

**Vercel → EL Hedaya project → Settings → Environment Variables**

Add these for **Production** (and Preview if desired):

```text
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=newsletter@elhedaya-cic.com
SMTP_PASSWORD=YOUR_HOSTINGER_MAILBOX_PASSWORD
NEWSLETTER_FROM=EL Hedaya Islamic School <newsletter@elhedaya-cic.com>
NEWSLETTER_REPLY_TO=newsletter@elhedaya-cic.com
PUBLIC_SITE_URL=https://elhedaya-cic.com
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

The API will reuse your existing Vercel values for:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

If you prefer, you may additionally define server aliases `SUPABASE_URL` and `SUPABASE_ANON_KEY`, but they are not required by this implementation.

### Important security rule

Only public browser configuration should use `VITE_...`. These must **not** use `VITE_`:

- `SMTP_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`

## 6. Deploy

```cmd
git add .
git commit -m "Use Hostinger SMTP for newsletters"
git push origin main
```

Vercel will build the frontend and automatically create the `/api/send-newsletter` serverless endpoint from the `api/` folder.

Because environment variables are captured per deployment, make sure the new server secrets are saved **before** the deployment you intend to test, or trigger another deployment after adding them.

## 7. Test in this order

1. Open the public site and subscribe a test email.
2. Confirm it appears in Supabase `newsletter_subscribers`.
3. Open `/school-gallery-admin` and sign in with the existing admin user.
4. Open **Newsletter**.
5. Compose a short newsletter.
6. Click **Send Test to Me** first.
7. Confirm the message arrives from `newsletter@elhedaya-cic.com` and check Inbox/Spam.
8. Confirm links and formatting.
9. Only then click **Send to Subscribers**.
10. Test the unsubscribe link with your test subscriber.

## Local testing note

`npm run dev` runs Vite only and does not emulate the Vercel `/api` function. The simplest end-to-end test is the deployed Preview/Production site. If you use the Vercel CLI, `vercel dev` can emulate the Vercel function locally.

## Recipient privacy

Every subscriber is sent an individual SMTP message. The implementation does not put the mailing list into To/CC/BCC, so recipients cannot see other subscriber addresses.

## Delivery scale

Hostinger's mailbox sending limits and anti-spam policies still apply. This implementation intentionally sends only a few messages concurrently. For a normal Sunday-school/community mailing list this is appropriate; if the list grows significantly, move delivery to a dedicated bulk-email provider or queue without changing the subscriber database/admin UI.

## V10 flyer attachment upgrade

For optional PDF/image flyer attachments, run `supabase/newsletter-flyer-attachments.sql` once and copy the V10 files into the project. See `NEWSLETTER-FLYER-SETUP.md` for details.
