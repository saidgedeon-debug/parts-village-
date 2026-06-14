# Parts Village Digital Catalog - Deployment Guide

Complete step-by-step guide to deploy the Parts Village Digital Catalog on Vercel with Supabase as the backend.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Supabase Project](#step-1-create-supabase-project)
3. [Step 2: Apply Database Schema](#step-2-apply-database-schema)
4. [Step 3: Insert Seed Data](#step-3-insert-seed-data)
5. [Step 4: Set Up Storage](#step-4-set-up-storage)
6. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
7. [Step 6: Create env.js for Frontend](#step-6-create-envjs-for-frontend)
8. [Step 7: Deploy to Vercel](#step-7-deploy-to-vercel)
9. [Step 8: Verify Deployment](#step-8-verify-deployment)
10. [Database Helper Functions](#database-helper-functions)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [Supabase account](https://supabase.com) (free tier works)
- [Vercel account](https://vercel.com) (free tier works)
- [Git](https://git-scm.com) installed locally
- Catalog data files from this repository

---

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Organization**: Select or create your organization
   - **Project Name**: `parts-village-catalog`
   - **Database Password**: Set a strong password (save it securely)
   - **Region**: Choose the closest region to your users
4. Click **"Create new project"** and wait for provisioning (1-2 minutes)

### Get Your API Credentials

1. In the left sidebar, click **Project Settings** (gear icon at the bottom)
2. Navigate to **API** in the settings menu
3. Copy these values:
   - **Project URL**: `https://xxxxxx.supabase.co` (this is `SUPABASE_URL`)
   - **anon/public** key (this is `SUPABASE_ANON_KEY`)
   - **service_role** key (for admin operations - keep secret!)

Save these somewhere safe - you'll need them in Steps 5 and 6.

---

## Step 2: Apply Database Schema

1. In your Supabase project dashboard, go to the **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Open `sql/schema.sql` from this repository
4. Copy the entire contents and paste into the SQL Editor
5. Click **"Run"** to execute the schema

### What the schema creates:
- `catalog_items` table with 50+ columns covering all catalog data
- B-tree and GIN indexes for fast searching
- Full-text search index for product names, part numbers, and brands
- Row Level Security (RLS) policies
- Auto-updating `updated_at` timestamp trigger
- Helper functions for search, filtering, and statistics

### Verify the schema was applied:

```sql
-- Check table exists and has rows
SELECT COUNT(*) FROM catalog_items;  -- Should return 0 (no data yet)

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'catalog_items';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = 'catalog_items';
```

---

## Step 3: Insert Seed Data

1. In the SQL Editor, click **"New query"**
2. Open `sql/seed_data.sql` from this repository
3. Copy the entire contents and paste into the SQL Editor
4. Click **"Run"** to insert the first 10 catalog items

### Verify seed data:

```sql
-- List all seeded items
SELECT item_code, product_name_en, brand, item_status
FROM catalog_items
ORDER BY item_code;

-- Should show 10 items including A01-1 (Komatsu), A01-3 (Caterpillar), etc.
```

---

## Step 4: Set Up Storage

The app uses Supabase Storage for product images.

### Create the "product-images" bucket:

1. In the left sidebar, click **Storage**
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `product-images`
   - **Public bucket**: **Checked** (images must be publicly accessible)
   - **File size limit**: `5242880` (5MB recommended)
   - **Allowed MIME types**: `image/png, image/jpeg, image/jpg, image/webp`
4. Click **"Save"**

### Set bucket policies (for uploads):

1. Click on the `product-images` bucket
2. Go to **Policies** tab
3. Add these policies:

**SELECT policy** (public can view images):
- Name: `Public can view images`
- Allowed operation: `SELECT`
- Target roles: `public, authenticated`
- Policy definition: `true`

**INSERT policy** (authenticated users can upload):
- Name: `Authenticated users can upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition: `true`

**DELETE policy** (authenticated users can delete):
- Name: `Authenticated users can delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- Policy definition: `true`

---

## Step 5: Configure Environment Variables

### For Vercel Deployment:

1. In your Vercel dashboard, select your project
2. Go to **Settings** > **Environment Variables**
3. Add these variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production |
| `SUPABASE_ANON_KEY` | `your-anon-key-here` | Production |
| `ADMIN_PASSWORD` | `your-secure-admin-password` | Production |

4. Click **"Save"**

### For Local Development:

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual Supabase credentials:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
ADMIN_PASSWORD=your-secure-admin-password
```

---

## Step 6: Create env.js for Frontend

The frontend app uses `window.ENV` for configuration since it's vanilla JavaScript (not a Node.js build). You need to expose the environment variables to the browser.

### Option A: Static env.js (for local testing)

Create `js/env.js`:

```javascript
// js/env.js - Environment variables for the frontend
// DO NOT commit this file with real credentials to version control!
window.ENV = {
  SUPABASE_URL: 'https://your-project-ref.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key-here',
  ADMIN_PASSWORD: 'your-admin-password'
};
```

Add to your `index.html` and `admin/index.html`:

```html
<script src="js/env.js"></script>
```

### Option B: Vercel Server-Side Injection (recommended for production)

For Vercel, you can use a serverless function to inject env vars. See the Vercel Functions documentation.

### Option C: Build-time script

Use a simple build script that reads from `.env` and generates `env.js`:

```bash
# generate-env.sh
#!/bin/bash
echo "window.ENV = {" > js/env.js
echo "  SUPABASE_URL: '${SUPABASE_URL}'," >> js/env.js
echo "  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'," >> js/env.js
echo "  ADMIN_PASSWORD: '${ADMIN_PASSWORD}'" >> js/env.js
echo "};" >> js/env.js
```

---

## Step 7: Deploy to Vercel

### Option A: Git-based deployment (recommended)

1. Push your project to GitHub/GitLab/Bitbucket
2. In Vercel, click **"Add New Project"**
3. Import your repository
4. Configure:
   - **Framework Preset**: `Other`
   - **Root Directory**: `.` (or your project root)
   - **Build Command**: (leave empty for static HTML)
   - **Output Directory**: `.` (project root)
5. Add the environment variables from Step 5
6. Click **"Deploy"**

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Configure `vercel.json` (optional)

Create a `vercel.json` in your project root for SPA routing support:

```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/admin/.*", "dest": "/admin/index.html" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

---

## Step 8: Verify Deployment

### Test the database connection:

1. Open your deployed site URL
2. Open browser DevTools (F12) > Console
3. You should see:
   ```
   [Parts Village] Database client module loaded. Status: online
   ```

### Test catalog loading:

```javascript
// In browser console:
await PartsVillageDB.fetchItems();
// Should return catalog data from Supabase
```

### Test search:

```javascript
// In browser console:
await PartsVillageDB.fetchItems({ search: 'Komatsu' });
// Should return Komatsu items
```

### Verify Storage:

1. Go to Supabase Dashboard > Storage
2. Upload a test image to `product-images` bucket
3. The image should be accessible via its public URL

---

## Database Helper Functions

The schema includes several PostgreSQL helper functions:

### `search_catalog_items(query TEXT)`
Full-text search across item_code, product names, OEM numbers, brand, and category:

```sql
SELECT * FROM search_catalog_items('7861-93-2310');
SELECT * FROM search_catalog_items('Komatsu');
```

### `search_by_machine(machine_query TEXT)`
Search for items compatible with a specific machine:

```sql
SELECT * FROM search_by_machine('PC200-7');
SELECT * FROM search_by_machine('E320D');
```

### `get_distinct_brands()`
Get list of all brands with item counts:

```sql
SELECT * FROM get_distinct_brands();
```

### `get_distinct_categories()`
Get list of all categories with item counts:

```sql
SELECT * FROM get_distinct_categories();
```

### `get_catalog_stats()`
Get dashboard statistics as JSON:

```sql
SELECT get_catalog_stats();
```

### `append_change_history(...)`
Programmatically log a change to an item:

```sql
SELECT append_change_history(
  'A01-1',           -- item_code
  'Updated',         -- action
  'selling_price',   -- field
  '',                -- old_value
  '45.00',           -- new_value
  'admin'            -- user
);
```

---

## Project File Structure

```
parts-village/
|
|-- index.html              # Main catalog page (public)
|-- admin/
|   -- index.html           # Admin panel (password protected)
|-- css/
|   -- style.css            # Main stylesheet
|   -- admin.css            # Admin panel stylesheet
|-- js/
|   -- app.js               # Main catalog application
|   -- admin.js             # Admin panel application
|   -- supabase-client.js   # Supabase client + CRUD helpers (this file)
|   -- env.js               # Environment variables (generated, don't commit!)
|-- sql/
|   -- schema.sql           # Database schema (run first)
|   -- seed_data.sql        # Sample data (10 items, run second)
|-- images/
|   -- icon.svg             # App icon/PWA manifest icon
|-- .env.example            # Environment variable template
|-- README-DEPLOY.md        # This file
```

---

## Troubleshooting

### "Supabase credentials not configured" warning
- Ensure `env.js` is loaded before `supabase-client.js` in your HTML
- Check that `window.ENV.SUPABASE_URL` and `window.ENV.SUPABASE_ANON_KEY` are set correctly
- Verify the Supabase project URL and anon key are correct

### "Failed to initialize Supabase client" error
- Check browser console for detailed error messages
- Ensure the CDN script is loaded before `supabase-client.js`:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="js/env.js"></script>
  <script src="js/supabase-client.js"></script>
  ```

### RLS policy errors (INSERT/UPDATE/DELETE forbidden)
- Supabase Auth is required for write operations
- Enable anonymous sign-up in Authentication > Settings, or
- Use the Service Role Key (server-side only, never expose to frontend)
- For admin-only apps, consider using Edge Functions with service role

### Images not loading from Storage
- Ensure the `product-images` bucket is set to **Public**
- Check Storage > Policies has a SELECT policy allowing public access
- Verify the image file path matches what's stored in the `main_image` column

### CORS errors
- In Supabase, go to Project Settings > API > CORS
- Add your Vercel deployment domain to the allowed origins
- For development, `http://localhost:*` should work by default

### "relation does not exist" error
- Run `sql/schema.sql` first before `sql/seed_data.sql`
- Check that the schema was applied in the SQL Editor (no errors in output)

---

## Next Steps

1. **Import all 36 items**: The seed data only includes 10 items. Use the admin panel or bulk import to add the remaining items.
2. **Set up authentication**: For a production app, configure Supabase Auth with email/password or OAuth providers.
3. **Add Edge Functions**: For sensitive operations (bulk updates, exports), use Supabase Edge Functions with the service role key.
4. **Configure backups**: Enable point-in-time recovery in Supabase for data safety.
5. **Set up monitoring**: Use Vercel Analytics and Supabase reports to monitor usage.

---

## Security Notes

- **Never commit `env.js`** with real credentials to version control
- **Never expose the Service Role Key** to the frontend
- Use Row Level Security (RLS) policies to restrict data access
- Consider using Supabase Auth instead of the simple password check for production
- Enable HTTPS only (enforced by Vercel and Supabase)
- Regularly rotate your Supabase API keys

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase JS Client**: https://supabase.com/docs/reference/javascript
