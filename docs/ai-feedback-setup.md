# Setting up optional AI feedback (Cloudflare Worker)

AI feedback for adults uses a small Cloudflare Worker (`worker/`) that holds the AssemblyAI key as a Worker secret and passes one recording at a time to AssemblyAI Universal-3.5 Pro. The website stays on Lovable. Until the Worker's address is added to the app, AI feedback stays switched off: the app says "AI feedback isn't connected yet" and nothing is uploaded.

**Cost:** $0. The Cloudflare Workers Free plan and Workers KV free tier are enough, and AssemblyAI's remaining free credit pays for transcription (about $0.0035 a minute). No card is needed anywhere. Don't add a card, auto-pay or top-up on AssemblyAI: with no card, AssemblyAI pauses the API when the credit runs out instead of charging, and the app then pauses AI feedback.

## What you need
- Your Cloudflare account (free).
- Your AssemblyAI API key, from the AssemblyAI dashboard. You'll paste it into the terminal prompt in step 4 only, never into a chat, a file in this repository, or Lovable.
- Node.js, which is already installed, and this repository on your Mac.

Every command runs from the `worker` folder, with Wrangler (Cloudflare's command-line tool) pinned to version 4.151.2. The `-c wrangler.jsonc` part matters: the app's own build leaves a Wrangler file at the top of the repository, and without it Wrangler stops with "Found both a user configuration file…".

```bash
cd ~/Projects/listify-reading-buddy/worker
```

## 1. Sign in to Cloudflare
```bash
npx wrangler@4.151.2 login
```
A browser window opens. Sign in to Cloudflare and choose **Allow** to give Wrangler access to your account, then return to the terminal. To check that it worked:
```bash
npx wrangler@4.151.2 whoami
```

## 2. Create the usage store
The Worker keeps one number per day (the minutes of audio sent) and a "credit ran out" flag here, and nothing else.
```bash
npx wrangler@4.151.2 kv namespace create USAGE -c wrangler.jsonc
```
It prints an `id`. In `worker/wrangler.jsonc`, replace `REPLACE_WITH_USAGE_KV_ID` with it. This id isn't a secret.

## 3. Say which website may use it
In `worker/wrangler.jsonc`, replace `REPLACE_WITH_PUBLISHED_APP_ORIGIN` with your published app's address: just the start, such as `https://your-app.lovable.app`, with no path and no trailing slash. To list several addresses, separate them with commas, for example to add a custom domain.

This stops other websites' pages from using your credit through a visitor's browser. It isn't a password, though. Someone determined could still call the Worker directly, so the real cap is the daily limit: `DAILY_AUDIO_MINUTES`, which is 60 minutes, at most about $0.21 a day.

## 4. Add the AssemblyAI key as a secret
```bash
npx wrangler@4.151.2 secret put ASSEMBLYAI_API_KEY -c wrangler.jsonc
```
Paste the key when asked and press Enter. The terminal doesn't show it as you paste. Cloudflare stores it encrypted, and it never appears in the repository, the website or the logs. If Wrangler asks whether to create the Worker, answer yes.

## 5. Deploy the Worker
```bash
npx wrangler@4.151.2 deploy -c wrangler.jsonc
```
It prints the Worker's address, ending in `.workers.dev`. Check that it answers:
```bash
curl -H "Origin: https://your-app.lovable.app" https://reading-buddy-ai-feedback.<your-subdomain>.workers.dev/status
```
Use your own published address and Worker address. The reply should include `"available":true` and `"training":"may-be-used"`.

## 6. Connect the app, then publish when you choose
In `src/lib/ai-feedback/config.ts`, set `WORKER_URL` to the Worker's address, then commit and push. You can also ask Claude to do this. The pushed change syncs to Lovable, but visitors only see AI feedback once **you** publish in Lovable.

## Day to day
- **Pause AI feedback for everyone:** set `"ENABLED": "false"` in `wrangler.jsonc` and run step 5 again. Recording and playback carry on as usual.
- **When the credit runs out:** AssemblyAI refuses the request, the Worker pauses AI feedback and tries again after 6 hours, and people see "AI feedback is paused: its free allowance has been used up. Recording and playback work as usual." Nothing is charged.
- **Check remaining credit:** on the AssemblyAI dashboard's Billing page.
- **Change the key:** run step 4 again with the new key.
- **Clean-up:** every 10 minutes the Worker deletes any finished transcript the app didn't collect, for example after someone closed the tab or chose "Stop waiting".

## Training and the EU servers (checked 4 November 2026)
- **What works:** your free key can use Universal-3.5 Pro through AssemblyAI's EU endpoint, `api.eu.assemblyai.com`. This was checked with a 34-second synthetic clip, which was then deleted. The Worker uses the EU servers, so audio and transcripts are stored in the EU.
- **Training isn't confirmed as excluded.** AssemblyAI's [data retention page](https://www.assemblyai.com/docs/data-retention-and-model-training.md) says files on its European servers aren't used for training. But its [data controls](https://assemblyai.com/docs/data-controls) and [opt-out FAQ](https://assemblyai.com/docs/faq/how-to-opt-out-of-data-sharing-for-our-model-improvement-program) say free users can't opt out of the model improvement programme. Nothing published says which rule applies to a free account on the EU servers.
- **What the app does meanwhile:** it treats recordings as possibly used for training and asks each adult to choose before anything is sent. `TRAINING` stays `"may-be-used"`.
- **If you want the simpler no-training wording:** ask AssemblyAI support in writing whether free-tier audio sent to the EU endpoint is excluded from model training. Only if they confirm it should `TRAINING` be set to `"excluded"` and the Worker redeployed. The app then asks once more with the simpler wording.

## Changing provider later
`worker/src/provider.ts` defines the small interface the Worker needs: send audio, check the transcript, delete it, and clean up. To use another service, add it there and set `PROVIDER`. Nothing switches provider automatically. Deepgram isn't wired in, because in the [experiment](ai-feedback-experiment.md) it made 47 false flags on the six recordings, against Universal-3.5 Pro's 3.
