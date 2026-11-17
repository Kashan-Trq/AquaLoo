# AquaLoop website release

The deployable Next.js project is this folder:

`AquaLoop_Vercel_Global`

## Local validation

```powershell
pnpm install
pnpm build
pnpm dev
```

Open `http://localhost:3000` to preview the site.

## Vercel deployment

1. Push the contents of `AquaLoop_Vercel_Global` to a GitHub repository, or import the repository into Vercel.
2. Select **Next.js** as the framework. Keep the project root at the folder containing `package.json`.
3. Use `pnpm build` as the build command if Vercel does not detect it automatically.
4. Deploy.

The public homepage is the startup/competition landing page. The old `/dashboard` route redirects to `/`.

## APK download

The Android app is served at:

`/downloads/aqualoop-app.apk`

To publish a newer APK, replace:

`public/downloads/aqualoop-app.apk`

Then commit, push and redeploy Vercel. The download buttons on the homepage already point to this path.

For a GitHub Release APK, set this Vercel environment variable instead:

```text
NEXT_PUBLIC_APK_URL=https://github.com/YOUR_USERNAME/YOUR_REPOSITORY/releases/download/v1.0.0/aqualoop-app.apk
```

The homepage opens the release asset directly in a new tab, which is more reliable on mobile browsers than forcing a cross-origin download.

## Supabase variables

The landing page and APK download do not need Supabase variables. Keep the existing variables only if you later re-enable the authentication/API routes:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The service-role key must remain a Vercel server environment variable and must never be exposed in browser code, the APK, GitHub or the `public` folder.
