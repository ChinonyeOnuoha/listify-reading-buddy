# Listify: Reading Buddy (working name)

A first prototype of a reading-aloud companion. Set a daily target, paste a passage, record yourself reading, and play it back.

## Inspiration
This is a separate, new project inspired by my original **Listify** to-do app (built during AltSchool):
- App: https://listify-a-to-do-app.vercel.app/
- Repository: https://github.com/ChinonyeOnuoha/Listify--A-To-do-App

It borrows Listify's plum, blush and peach palette, rounded controls and friendly voice. The original app and repository are untouched.

## How a session works: Prepare → Read → Review
1. **Prepare** — set a daily target, then choose "Paste your content" (text box appears) or "Upload your content" (multiple page photos/screenshots, numbered, with move up/down, replace and remove). Switching between the two keeps both. "Continue to reading" unlocks once text or at least one page is supplied.
2. **Read** — the passage or pages fill the screen. Timer, target progress and Start/Stop recording stay together (a bottom dock on phones, a side panel on desktop). "Upload audio instead" is the secondary option. Reaching the target never stops the recording. A friendly message appears if the microphone is blocked.
3. **Review** — play back the recording and see its duration. Discard the recording or start a new session (both ask for confirmation). "Explore sample feedback" opens labelled examples one at a time.

Moving between steps keeps the target, passage, pages and audio.

## What is demonstrated with sample data
Six clearly labelled SAMPLE examples on a made-up passage: extra repetitions, missing/added/replaced words, pauses that may interrupt phrasing, pace changes, nothing found, and couldn't assess. Each shows the relevant words, an observation, one priority experiment for a new passage and optional extra tips. They are never presented as analysis of your recording.

## Not connected yet
- Automatic text extraction from photos.
- Live AI analysis of recordings.
- No servers, paid services or AI providers are used. Passage text, photos and recordings stay in the current browser tab.

## Run it
```bash
bun install
bun run dev
```
Then open the local URL shown in the terminal.

## AI assistance
The code, layout, sample feedback text and this README were drafted with Lovable (an AI-assisted builder) from my written brief. Product direction, tone and review are mine.

## Testing
See `TESTING_LOG.md`. Never commit real recordings or API keys.
