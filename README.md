# Interim Model Website

This repository is prepared for deployment as a Render static site.

## Local development

Prerequisite: Node.js

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Open:
   `http://localhost:5173/`

## Deploy to Render

This repo now includes [render.yaml](./render.yaml) for Render Blueprint/static-site deployment.

Recommended settings:

1. Create a new Static Site in Render or sync the included Blueprint.
2. Use the repository root as the app root.
3. Build command:
   `npm install && npm run build`
4. Publish directory:
   `dist`

Notes:

- The site is configured to serve as a static SPA with a rewrite to `/index.html`.
- Model files in `public/models/` are published with the app and should load from same-origin paths such as `/models/NO2FBX.fbx`.
- External Google Fonts have been removed so first load does not depend on `fonts.googleapis.com`.
