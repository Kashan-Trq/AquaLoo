# AquaLoop final startup website

This is a buildless, responsive static site designed for Vercel. It is intentionally dependency free: deploy the folder as a static project or replace the Vercel-connected repository contents with these files.

## Deploy on Vercel

1. Put `index.html` at the project root of the repository connected to `aqualoop-water.vercel.app`.
2. Set the framework preset to **Other** and leave the build command empty.
3. Set the output directory to `.`.
4. Redeploy.

The page contains one dedicated Android download action, a mission-led narrative, a four-step product story, prototype evidence, pilot roadmap, responsive mobile navigation, and accessible focus states.

## APK hosting

The download button points to the GitHub Release asset `app-release.apk` under release tag `v1.0.0`. Create that release and upload the APK with exactly that filename, or update the URL in `index.html` to match your own release tag and asset name.

## Content note

The demo numbers shown in the live product are labeled as demo/prototype values. Replace them with verified field results once the pilot has produced evidence.
