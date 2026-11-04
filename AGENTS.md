<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Reading Buddy keeps recordings, photos and passage text on the device (IndexedDB via src/lib/device-store.ts, with delete controls in Saved) and never sends them to a server — privacy requirement of the prototype. The one exception is optional AI feedback for adults (src/components/app/AiFeedback.tsx, worker/): only after an adult has chosen it and then asks for feedback on a recording, that recording's audio (never the passage or pages) goes through the Cloudflare Worker to AssemblyAI. It is off until WORKER_URL is set in src/lib/ai-feedback/config.ts, and the children's corner never uses it. Keep the consent wording true to the backend (training may apply; no opt-out switch).
- Sample feedback data lives in src/lib/sample-feedback.ts and must stay visually labelled as SAMPLE, separate from user recordings.
