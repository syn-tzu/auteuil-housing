# Setting up the Auteuil & Passy app — your part

Everything below is an account or a key that only you can create. Each step ends with something to
paste into the file `.env.local` in this folder (open it with Notepad). None of it needs any coding.

You'll need four things: a Supabase project (the database), an Anthropic API key (reads the emails),
a Gmail "app password" (lets the app read the alert inbox), and later a Vercel account (hosts the app).

---

## 1. Supabase — the database and the two logins (15 minutes)

1. Go to https://supabase.com and click **Start your project**. Sign up with your email or GitHub.
2. Click **New project**. Name it `auteuil-housing`, pick a strong database password (save it in your
   password manager; you rarely need it again), choose region **West EU (Paris)** or **Central EU
   (Frankfurt)**, and the **Free** plan. Wait about a minute for it to be created.
3. In the left menu click the gear icon **Project Settings → API**. Copy these three values into `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`. Treat this one like a password.
4. Create the tables: in the left menu click **SQL Editor → New query**. Open the file
   `supabase/migrations/0001_init.sql` from this folder in Notepad, copy *all* of it, paste it into the
   query box, and click **Run**. You should see "Success. No rows returned".
5. Create the two logins: left menu **Authentication → Users → Add user → Create new user**.
   Enter your email and a password, tick **Auto Confirm User**, click **Create user**. Repeat for Diana.
6. Stop anyone else from signing up: **Authentication → Sign In / Providers → Email** and turn **off**
   "Allow new users to sign up". Save.

## 2. Anthropic API key — lets the app read listings with Claude (5 minutes)

1. Go to https://console.anthropic.com and sign in (or create an account).
2. **Billing** → add a payment method and buy a small amount of credit, for example $20. Each alert email
   costs a few cents to read, so this lasts months.
3. **API keys → Create key**, name it `auteuil-housing`, copy it into `.env.local` as `ANTHROPIC_API_KEY`.
   It's shown only once.

## 3. Gmail app password — lets the app read stuartanddiana@gmail.com (5 minutes)

1. Sign in to Gmail as **stuartanddiana@gmail.com**.
2. Go to https://myaccount.google.com/security. Under "How you sign in to Google", turn on
   **2-Step Verification** if it isn't already (it walks you through it with your phone).
3. Go to https://myaccount.google.com/apppasswords. Type the name `auteuil-housing` and click **Create**.
   Google shows a 16-letter password in four groups. Copy it into `.env.local` as `GMAIL_APP_PASSWORD`
   (spaces are fine). `GMAIL_USER` is already set to stuartanddiana@gmail.com.
4. Nothing else to change: Gmail's IMAP access is on by default.

## 4. Set up the property alerts (ongoing, 5 minutes per site)

On each site, search for what you want and save the search with email alerts sent to
**stuartanddiana@gmail.com**. Do it once for rent and once for buy if you want both.

Use these areas on every site: **Auteuil Nord**, **Auteuil Sud**, **Muette** (some sites call it Passy /
La Muette; all three are inside Paris 16e, postcode 75016).

- SeLoger: https://www.seloger.com — search, then "Créer une alerte".
- Bien'ici: https://www.bienici.com — "Créer une alerte".
- PAP (owner-direct): https://www.pap.fr — "Recevoir les nouvelles annonces".
- Belles Demeures (high end, hôtels particuliers): https://www.bellesdemeures.com — "Alerte".
- LeBonCoin: https://www.leboncoin.fr — "Créer une alerte" (needs a LeBonCoin account).
- Junot Passy–La Muette: https://www.junot.fr — sign up for new-listing notifications for the 16e.

Tip: you don't need to read that inbox. The app reads new emails every 30 minutes and marks them as read.

## 5. Vercel — putting the app on the internet so it works on your phones (20 minutes, later)

Not needed to try the app on this computer. When you're ready, I'll walk you through it: a free GitHub
account, a free Vercel account, one click to import the project, and pasting the same `.env.local`
values into Vercel's settings. Vercel then runs the inbox check automatically every 30 minutes.

## 6. Putting it on your Android phone

Once the app is on Vercel, open its address in Chrome on the phone, tap the **⋮** menu, then
**Add to Home screen**. It behaves like an installed app. Same on iPhone via Safari's Share → Add to Home Screen.
