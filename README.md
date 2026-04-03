<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c192d849-ece4-41e8-8f07-d1446b3a923b

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and configure:
   - `VITE_CLOUDFLARE_WORKER_URL` (Cloudflare worker route)
   - `CF_API_KEY`, `CF_ACCOUNT_ID`, `CF_AI_MODEL`
3. Run the app:
   `npm run dev`

## Deploy to Cloudflare Worker + Pages

1. Add a Cloudflare worker at `worker/index.ts`.
2. Configure secrets with Wrangler:
   - `wrangler secret put CF_API_KEY`
   - `wrangler secret put CF_ACCOUNT_ID`
   - `wrangler secret put CF_AI_MODEL`
3. Deploy worker:
   `wrangler deploy --env production`
4. Use deployed worker URL in `VITE_CLOUDFLARE_WORKER_URL`.
5. Deploy `FuelVerify-AI` app to Cloudflare Pages, ensuring env var points to worker endpoint.

