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
3. Copy three values into `.env.local`:
   - **Project URL**: click the green **Connect** button at the top, choose **App Frameworks → Next.js**.
     Copy the address on the `NEXT_PUBLIC_SUPABASE_URL=` line (it looks like `https://abcdefgh.supabase.co`)
     → `NEXT_PUBLIC_SUPABASE_URL`
   - Left menu, gear icon **Project Settings → API Keys**. Under **Publishable key**, copy the key starting
     `sb_publishable_` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Same page, under **Secret keys**, click the eye icon then copy the key starting `sb_secret_`
     → `SUPABASE_SERVICE_ROLE_KEY`. Treat this one like a password.
   (Older guides call these "anon" and "service_role" keys; the new names work the same.)
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

## 5. Vercel — putting the app on the internet so it works on your phones (20 minutes)

The code is already on GitHub at https://github.com/syn-tzu/auteuil-housing (private).

1. Go to https://vercel.com/signup and choose **Continue with GitHub**. Pick the free **Hobby** plan.
2. On the Vercel dashboard click **Add New… → Project**. Find **auteuil-housing** in the list and click
   **Import**. If it isn't listed, click "Adjust GitHub App Permissions" and give Vercel access to that
   repository.
3. On the import screen, leave Framework as **Next.js** and the other settings as they are.
4. Open the **Environment Variables** section. Open your `.env.local` file in Notepad, select all
   (Ctrl+A), copy (Ctrl+C), click into the **Key** box on Vercel and paste (Ctrl+V). Vercel fills in all
   seven values at once. Check they're all there: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, CRON_SECRET.
5. Click **Deploy** and wait about two minutes. When it says Congratulations, click **Continue to
   Dashboard**. Near the top you'll see the app's address, something like
   `https://auteuil-housing.vercel.app`. Copy it; you'll need it twice below.
6. Open that address in your browser and sign in with the Supabase login you created in step 1.5.

### 5b. Make the inbox check run every 30 minutes

Vercel's free plan only runs the check once a day, so GitHub gives the extra nudges. Two settings:

1. Go to https://github.com/syn-tzu/auteuil-housing/settings/secrets/actions and click
   **New repository secret**.
2. Name: `APP_URL`, Secret: the app's address from step 5.5, without a trailing slash
   (e.g. `https://auteuil-housing.vercel.app`). Click **Add secret**.
3. **New repository secret** again. Name: `CRON_SECRET`, Secret: the same CRON_SECRET line's value from
   `.env.local`. Add.
4. Go to https://github.com/syn-tzu/auteuil-housing/actions, click **Check inbox** on the left, then
   **Run workflow → Run workflow**. A green tick within a minute means everything is connected.

## 6. Putting it on your Android phone

Once the app is on Vercel, open its address in Chrome on the phone, tap the **⋮** menu, then
**Add to Home screen**. It behaves like an installed app. Same on iPhone via Safari's Share → Add to Home Screen.
