# Listify: Reading Buddy (working name)

A first prototype of a reading-aloud companion. Set a daily target, paste a passage, record yourself reading, and play it back.

## Inspiration
This is a separate, new project inspired by my original **Listify** to-do app (built during AltSchool):
- App: https://listify-a-to-do-app.vercel.app/
- Repository: https://github.com/ChinonyeOnuoha/Listify--A-To-do-App

It borrows Listify's plum, blush and peach palette, rounded controls and friendly voice. The original app and repository are untouched.

## What works (real)
- Daily reading target in minutes, with a progress bar.
- Paste a passage; it stays visible (read-only) while recording.
- Add a page photo or screenshot with a large preview.
- Record, stop, play back and discard audio using the browser microphone.
- Upload an audio file instead of recording.
- Friendly message when the microphone is unavailable.

## What is demonstrated with sample data
- Feedback cards (repeated words, added/omitted/substituted words, pauses, pacing), a "no findings" case and an "uncertain" case.
- These are clearly labelled **SAMPLE FEEDBACK** and are never presented as analysis of your recording.

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
