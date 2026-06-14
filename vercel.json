# Parts Village - Supabase + Vercel Deployment Guide
# Step-by-Step (Complete Walkthrough)

---

## OVERVIEW

This guide walks you through connecting your Parts Village catalog to Supabase (database + storage) and deploying it on your own Vercel account. By the end, you'll have:

- A live website URL on Vercel
- A Supabase PostgreSQL database storing all your parts
- Cloud image storage for product photos
- Admin login with password protection

**Estimated time: 15-20 minutes**

---

## STEP 1: Create Your Supabase Account & Project

### 1.1 Sign up at Supabase

1. Go to **https://supabase.com**
2. Click **"Start your project"** (green button)
3. Sign up with **GitHub** (easiest) or email
4. Verify your email if needed

### 1.2 Create a New Project

1. In the Supabase dashboard, click **"New Project"**
2. Fill in:
   - **Organization**: Pick "Default Organization" (or create one)
   - **Project Name**: `parts-village`
   - **Database Password**: Choose a STRONG password and save it somewhere safe (you won't need it often, but don't lose it)
   - **Region**: Pick the closest to you (e.g., `N. Virginia (us-east-1)` for US users)
3. Click **"Create new project"**
4. Wait 1-2 minutes for provisioning (you'll see a loading screen)

### 1.3 Copy Your API Credentials (IMPORTANT!)

Once your project is ready:

1. In the left sidebar, click **Project Settings** (gear icon at the bottom)
2. Click **API** in the menu
3. You'll see two key values. Copy and save them:

```
Project URL:     https://XXXXXXXXXXXXXX.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save both values** - you'll paste them into the code in Step 4.

> **Security note:** The `anon` key is safe to put in your frontend code. The `service_role` key should NEVER be exposed in the frontend - keep it secret.

---

## STEP 2: Create the Database (Run SQL Schema)

### 2.1 Open SQL Editor

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"** (blue button)

### 2.2 Create the Catalog Table

1. Open the file `sql/schema.sql` from the project folder
2. Copy ALL of its contents
3. Paste into the SQL Editor
4. Click **"Run"** (green play button)

You should see "Success. No rows returned" in the output panel.

### 2.3 Verify the Table Was Created

In the SQL Editor, click **"New query"** and paste:

```sql
SELECT COUNT(*) FROM catalog_items;
```

Click **Run**. It should show `0` (the table is empty - that's correct).

---

## STEP 3: Set Up Image Storage

Your product images will be stored in Supabase Storage (like cloud storage).

### 3.1 Create a Storage Bucket

1. In the left sidebar, click **"Storage"**
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `product-images`
   - **Public bucket**: **CHECK THIS BOX** (images must be publicly viewable)
4. Click **"Save"**

### 3.2 Set Storage Policies

1. Click on the `product-images` bucket you just created
2. Click the **"Policies"** tab
3. Click **"New Policy"** and add these three policies:

**Policy 1 - Allow anyone to view images:**
- Name: `Public can view images`
- Allowed operation: `SELECT`
- Target roles: `public, authenticated` (check both)
- Policy definition: `true`
- Click **Save**

**Policy 2 - Allow authenticated users to upload:**
- Name: `Authenticated users can upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated` (check this)
- Policy definition: `true`
- Click **Save**

**Policy 3 - Allow authenticated users to delete:**
- Name: `Authenticated users can delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated` (check this)
- Policy definition: `true`
- Click **Save**

---

## STEP 4: Add Your Supabase Credentials to the Code

Now you need to paste your Supabase credentials into the HTML files so the app can connect.

### 4.1 Edit index.html (Main Catalog)

Open `index.html` in a text editor and find these lines (around line 119):

```html
<script>
window.ENV = {
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};
</script>
```

Replace with your actual values from Step 1.3:

```html
<script>
window.ENV = {
    SUPABASE_URL: 'https://XXXXXXXXXXXXXX.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
</script>
```

### 4.2 Edit admin/index.html (Admin Panel)

Open `admin/index.html` and find the same block (around line 251):

```html
<script>
window.ENV = {
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};
</script>
```

Replace with the SAME values:

```html
<script>
window.ENV = {
    SUPABASE_URL: 'https://XXXXXXXXXXXXXX.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
</script>
```

### 4.3 (Optional) Change Admin Password

In `admin/index.html`, you can also set a custom admin password. Find:

```html
<script>
window.ENV = {
    SUPABASE_URL: '...',
    SUPABASE_ANON_KEY: '...'
    // You can add: ADMIN_PASSWORD: 'your-custom-password'
};
</script>
```

If you want a custom password, change it to:

```html
<script>
window.ENV = {
    SUPABASE_URL: 'https://XXXXXXXXXXXXXX.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    ADMIN_PASSWORD: 'your-secure-password-here'
};
</script>
```

> If you don't set ADMIN_PASSWORD, the default is `admin123`.

---

## STEP 5: Deploy to Vercel

Now you'll put your site live on the internet using Vercel.

### Option A: Deploy via Vercel Website (Easiest)

#### 5.1 Push to GitHub (Recommended)

1. Go to **https://github.com/new** and create a new repository
   - Name: `parts-village-catalog`
   - Make it **Private** (your code stays private)
   - Click **Create repository**

2. In your terminal/command prompt, navigate to the project folder:

```bash
cd /path/to/parts-village
```

3. Initialize Git and push:

```bash
git init
git add .
git commit -m "Initial commit - Parts Village catalog"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/parts-village-catalog.git
git push -u origin main
n```

#### 5.2 Connect to Vercel

1. Go to **https://vercel.com** and sign up (use the same GitHub account)
2. Click **"Add New Project"**
3. Find and select your `parts-village-catalog` repository
4. In the configuration:
   - **Framework Preset**: Select `Other`
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty (it's a static HTML site)
   - **Output Directory**: Leave empty
5. Click **"Deploy"**

Wait about 1 minute. Vercel will give you a URL like:
`https://parts-village-catalog.vercel.app`

### Option B: Deploy via Vercel CLI

If you have Node.js installed:

```bash
# Install Vercel CLI
npm i -g vercel

# Login (opens browser)
vercel login

# Deploy (run in project folder)
cd /path/to/parts-village
vercel --prod
```

Follow the prompts. It will ask you to confirm settings - just press Enter to accept defaults.

You'll get a live URL at the end.

---

## STEP 6: Verify Everything Works

### 6.1 Check the Main Catalog

1. Open your Vercel URL: `https://your-project.vercel.app`
2. The status bar at the top should show:
   - `Database: Empty - Add your parts` (if no data yet) OR
   - `Database: Supabase` (if you have data)
   - `Mode: Standalone Mode` (working without Supabase) OR
   - `Mode: Supabase Online` (connected to Supabase)

### 6.2 Check the Admin Panel

1. Go to `https://your-project.vercel.app/admin/index.html`
2. Log in with your password (default: `admin123`)
3. You should see the empty admin dashboard
4. Click **"+ Add New"** to create a test part

### 6.3 Test Adding a Part

1. In the admin panel, click **"+ Add New"**
2. Fill in some fields:
   - OEM Part Number: `TEST-001`
   - Product Name (EN): `Test Revolution Sensor`
   - Brand: `Test Brand`
   - Category: `Revolution Sensor`
3. Click **"Save Changes"**
4. The part should appear in the table
5. Go back to the main catalog - you should see your new part!

---

## STEP 7: (Optional) Set Up Supabase Auth for Cloud Admin Login

If you want admin login to work through Supabase (instead of the local password), set up authentication:

### 7.1 Enable Email Auth

1. In Supabase, click **Authentication** in the left sidebar
2. Click **Providers**
3. Make sure **Email** is enabled (toggle should be ON)
4. Set **Confirm email** to OFF (for easier testing)
5. Click **Save**

### 7.2 Create an Admin User

1. In Supabase, click **Authentication** > **Users**
2. Click **"Add user"** (or **"Invite"**)
3. Email: `admin@partsvillage.com`
4. Password: Choose a strong password
5. Click **"Create user"**

Now when you log into the admin panel, you can use:
- **Email**: `admin@partsvillage.com`
- **Password**: The one you just set

The app will automatically try Supabase Auth first, then fall back to the local password if Supabase isn't configured.

---

## STEP 8: Upload Product Images

### 8.1 Direct Upload (Admin Panel)

1. Go to Admin Panel > Edit a part
2. Click the **"Image"** tab
3. Click **"Upload New Image"**
4. Select an image from your computer
5. The image uploads to Supabase Storage and the URL is saved automatically

### 8.2 Bulk Upload (Supabase Dashboard)

1. Go to Supabase > **Storage** > **product-images** bucket
2. Click **"Upload files"**
3. Select multiple images
4. After upload, copy each image's public URL
5. Paste the URLs into the `main_image` field for each part in the admin panel

To get a public URL for an uploaded image:
1. In the Storage bucket, click on the image
2. Click the **"Get URL"** button
3. Copy the URL

---

## TROUBLESHOOTING

### "Failed to connect to Supabase"
- Check that you pasted the correct URL and key in BOTH `index.html` and `admin/index.html`
- Make sure the URL starts with `https://` and ends with `.supabase.co`
- Check browser console (F12) for specific error messages

### "RLS policy violation" when saving
- This means the Row Level Security is blocking writes
- The app uses localStorage as fallback, so data still saves locally
- To enable cloud saves, set up Supabase Auth (Step 7) and log in

### Admin password not working
- Default password is `admin123`
- If you set `ADMIN_PASSWORD` in the ENV block, use that instead
- Check that there are no extra spaces in the password field

### Images not showing
- Make sure the `product-images` bucket is set to **Public**
- Check Storage > Policies has a SELECT policy with `true` as the definition
- In the admin panel, verify the `main_image` field has the correct URL

### CORS errors in browser console
- In Supabase, go to Project Settings > API > CORS
- Add your Vercel domain to allowed origins (e.g., `https://parts-village.vercel.app`)
- Also add `https://*.vercel.app` as a wildcard

---

## YOUR FILES (Quick Reference)

| File | What to Edit | What to Put There |
|------|-------------|-------------------|
| `index.html` | `window.ENV.SUPABASE_URL` | Your Supabase project URL |
| `index.html` | `window.ENV.SUPABASE_ANON_KEY` | Your Supabase anon key |
| `admin/index.html` | `window.ENV.SUPABASE_URL` | Same Supabase project URL |
| `admin/index.html` | `window.ENV.SUPABASE_ANON_KEY` | Same Supabase anon key |
| `admin/index.html` | `window.ENV.ADMIN_PASSWORD` | (Optional) Custom admin password |

---

## NEXT STEPS

Once your app is live:

1. **Add your parts** via the admin panel (+ Add New button)
2. **Upload product images** (Image tab in edit modal)
3. **Import existing data** if you have a JSON/CSV file
4. **Customize the branding** - edit the logo text and colors in CSS
5. **Share the URL** with your team or customers

---

## NEED HELP?

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Status**: https://status.supabase.com (check if services are down)
